import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ObjectStorageService, sanitizeFileName, validateOfferFolder, ALLOWED_OFFER_FOLDERS } from '../../server/objectStorage';

describe('ObjectStorage Security Tests', () => {
  let objectStorage: ObjectStorageService;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.PRIVATE_OBJECT_DIR = '/test-private-bucket';
    objectStorage = new ObjectStorageService();
  });

  describe('sanitizeFileName', () => {
    it('should reject path traversal attempts', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        './../../sensitive.txt',
        'normal/../../../evil.txt',
        '....//....//etc/hosts',
        '%2e%2e%2f%2e%2e%2fpasswd', // URL encoded
      ];

      maliciousNames.forEach(name => {
        expect(() => sanitizeFileName(name)).toThrow();
      });
    });

    it('should reject files without valid extensions', () => {
      const invalidFiles = [
        'malicious.exe',
        'script.bat',
        'virus.sh',
        'trojan.scr',
        'malware.cmd',
        'backdoor.ps1',
        'file_without_extension',
        'malicious.exe',
        'script.bat'
      ];

      invalidFiles.forEach(name => {
        expect(() => sanitizeFileName(name)).toThrow(); // Should throw either extension or missing extension error
      });
    });

    it('should accept and properly sanitize valid files', () => {
      const testCases = [
        {
          input: 'My Document.pdf',
          expected: 'my-document.pdf'
        },
        {
          input: 'Rapport Étude Technique 2024.docx',
          expected: 'rapport-tude-technique-2024.docx'
        },
        {
          input: 'Plan-Architecture  v2.1.jpg',
          expected: 'plan-architecture-v21.jpg'
        },
        {
          input: 'DEVIS_FINAL!!!.xlsx',
          expected: 'devis_final.xlsx'
        },
        {
          input: 'données@spéciales#%.png',
          expected: 'donnesspciales.png'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = sanitizeFileName(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle edge cases', () => {
      expect(() => sanitizeFileName('')).toThrow(/File name is required/);
      expect(() => sanitizeFileName(null as any)).toThrow(/File name is required/);
      expect(() => sanitizeFileName(undefined as any)).toThrow(/File name is required/);
      expect(() => sanitizeFileName(123 as any)).toThrow(/must be a string/);
    });

    it('should limit file name length', () => {
      const veryLongName = 'a'.repeat(200) + '.pdf';
      const result = sanitizeFileName(veryLongName);
      expect(result.length).toBeLessThanOrEqual(84); // 80 chars for name + '.pdf'
      expect(result).toMatch(/\.pdf$/); // Should still end with .pdf
    });

    it('should remove dangerous characters', () => {
      const dangerousChars = 'test<>:|?*file.pdf'; // Remove / and \ as they trigger path traversal protection
      const result = sanitizeFileName(dangerousChars);
      expect(result).toBe('testfile.pdf');
    });
  });

  describe('validateOfferFolder', () => {
    it('should accept only whitelisted folder names', () => {
      ALLOWED_OFFER_FOLDERS.forEach(folder => {
        expect(() => validateOfferFolder(folder)).not.toThrow();
        expect(validateOfferFolder(folder)).toBe(folder);
      });
    });

    it('should reject non-whitelisted folder names', () => {
      const maliciousFolders = [
        '../../../etc',
        '..\\windows',
        '/root',
        'unauthorized-folder',
        '04-Malicious-Folder',
        'Documents', // sounds legitimate but not in whitelist
        '01-DCE-Cotes-Photos-Modified', // similar but not exact
      ];
      
      // Handle empty/whitespace separately as they have different error messages
      expect(() => validateOfferFolder('')).toThrow(/Folder name is required/);
      expect(() => validateOfferFolder(' ')).toThrow(/Invalid folder name/);

      maliciousFolders.forEach(folder => {
        expect(() => validateOfferFolder(folder)).toThrow(/Invalid folder name/);
      });
    });

    it('should handle edge cases', () => {
      expect(() => validateOfferFolder('')).toThrow(/Folder name is required/);
      expect(() => validateOfferFolder(null as any)).toThrow(/Folder name is required/);
      expect(() => validateOfferFolder(undefined as any)).toThrow(/Folder name is required/);
      expect(() => validateOfferFolder(123 as any)).toThrow(/must be a string/);
    });
  });

  describe('getOfferFileUploadURL', () => {
    it('should reject path traversal in folder names', async () => {
      const maliciousFolders = [
        '../../../etc',
        '../../sensitive',
        'valid-folder/../../../evil'
      ];

      for (const folder of maliciousFolders) {
        await expect(
          objectStorage.getOfferFileUploadURL('valid-offer-id', folder, 'test.pdf')
        ).rejects.toThrow(/Invalid folder name/);
      }
    });

    it('should reject malicious file names', async () => {
      const maliciousFiles = [
        '../../../passwd',
        '../../evil.txt',
        'test.exe',
        'script.bat'
      ];

      for (const fileName of maliciousFiles) {
        await expect(
          objectStorage.getOfferFileUploadURL('valid-offer-id', '01-DCE-Cotes-Photos', fileName)
        ).rejects.toThrow();
      }
    });

    it('should reject invalid offer IDs', async () => {
      const invalidOfferIds = [
        '',
        'short',
        null as any,
        undefined as any,
        123 as any,
        'a'.repeat(5) // too short
      ];

      for (const offerId of invalidOfferIds) {
        await expect(
          objectStorage.getOfferFileUploadURL(offerId, '01-DCE-Cotes-Photos', 'test.pdf')
        ).rejects.toThrow(/Invalid offer ID/);
      }
    });

    it('should accept valid inputs and generate URL', async () => {
      // Mock the signObjectURL function to avoid actual API calls
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ signed_url: 'https://mock-url.com/signed' })
      } as any);

      try {
        const result = await objectStorage.getOfferFileUploadURL(
          'valid-offer-id-123',
          '01-DCE-Cotes-Photos',
          'document.pdf'
        );
        expect(result).toBe('https://mock-url.com/signed');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should sanitize file names in the URL generation process', async () => {
      // Mock the signObjectURL function
      const originalFetch = global.fetch;
      let capturedObjectName = '';
      
      global.fetch = vi.fn().mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        capturedObjectName = body.object_name;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ signed_url: 'https://mock-url.com/signed' })
        });
      });

      try {
        await objectStorage.getOfferFileUploadURL(
          'valid-offer-id-123',
          '01-DCE-Cotes-Photos',
          'My Document With Spaces.pdf'
        );
        
        // Verify the object name contains the sanitized file name
        expect(capturedObjectName).toContain('my-document-with-spaces.pdf');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Integration Security Tests', () => {
    it('should prevent directory escape through combined attacks', async () => {
      const attackVectors = [
        {
          offerId: '../../../etc',
          folderName: '01-DCE-Cotes-Photos',
          fileName: 'passwd'
        },
        {
          offerId: 'valid-offer',
          folderName: '../../../etc',
          fileName: 'passwd'
        },
        {
          offerId: 'valid-offer',
          folderName: '01-DCE-Cotes-Photos',
          fileName: '../../../passwd'
        },
        {
          offerId: 'valid-offer/../../../',
          folderName: '01-DCE-Cotes-Photos/../../../etc',
          fileName: '../../../passwd.pdf'
        }
      ];

      for (const attack of attackVectors) {
        await expect(
          objectStorage.getOfferFileUploadURL(attack.offerId, attack.folderName, attack.fileName)
        ).rejects.toThrow();
      }
    });

    it('should log security events for monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      // Mock the signObjectURL function
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ signed_url: 'https://mock-url.com/signed' })
      } as any);

      try {
        await objectStorage.getOfferFileUploadURL(
          'test-offer-123',
          '01-DCE-Cotes-Photos',
          'test-document.pdf'
        );
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ObjectStorage] Secure upload URL generated')
        );
      } finally {
        global.fetch = originalFetch;
        consoleSpy.mockRestore();
      }
    });
  });
});