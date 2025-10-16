import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bug, Loader2, Terminal, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { InsertBugReport } from "@shared/schema";

// Interface pour l'utilisateur connecté
interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

// Interface pour les logs console collectés
interface ConsoleLog {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  args?: any[]; // Arguments originaux si pertinents
}

// Configuration pour la collecte des logs
const CONSOLE_LOGGER_CONFIG = {
  MAX_LOGS: 100,
  STORAGE_KEY: 'saxium_console_logs',
  EXPIRY_HOURS: 24,
} as const;

// Hook personnalisé pour la collecte automatique des logs console
const useConsoleLogger = () => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const originalConsoleMethods = useRef<{
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  } | null>(null);
  const isSetupRef = useRef(false);

  // Fonction pour formater les arguments de console en string
  const formatConsoleArgs = useCallback((args: any[]): string => {
    try {
      return args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' ');
    } catch {
      return '[Arguments non formatables]';
    }
  }, []);

  // Fonction pour ajouter un log
  const addLog = useCallback((level: ConsoleLog['level'], args: any[]) => {
    const newLog: ConsoleLog = {
      timestamp: new Date().toISOString(),
      level,
      message: formatConsoleArgs(args),
      args: args.length <= 3 ? args : args.slice(0, 3), // Limiter les args pour éviter trop de mémoire
    };

    // Différer la mise à jour pour éviter les setState pendant le rendu d'autres composants
    queueMicrotask(() => {
      setLogs(prevLogs => {
        const updatedLogs = [...prevLogs, newLog];
        // Appliquer la limite FIFO
        const limitedLogs = updatedLogs.slice(-CONSOLE_LOGGER_CONFIG.MAX_LOGS);
        
        // Sauvegarder en localStorage avec timestamp d'expiration
        try {
          const storageData = {
            logs: limitedLogs,
            expiry: Date.now() + (CONSOLE_LOGGER_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000),
          };
          localStorage.setItem(CONSOLE_LOGGER_CONFIG.STORAGE_KEY, JSON.stringify(storageData));
        } catch (error) {
          console.warn('Impossible de sauvegarder les logs en localStorage:', error);
        }
        
        return limitedLogs;
      });
    });
  }, [formatConsoleArgs]);

  // Fonction pour charger les logs depuis localStorage
  const loadStoredLogs = useCallback(() => {
    // Différer le chargement pour éviter les setState pendant le rendu d'autres composants
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(CONSOLE_LOGGER_CONFIG.STORAGE_KEY);
        if (stored) {
          const storageData = JSON.parse(stored);
          
          // Vérifier l'expiration
          if (storageData.expiry && Date.now() < storageData.expiry) {
            if (Array.isArray(storageData.logs)) {
              setLogs(storageData.logs);
            }
          } else {
            // Nettoyer les logs expirés
            localStorage.removeItem(CONSOLE_LOGGER_CONFIG.STORAGE_KEY);
          }
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des logs depuis localStorage:', error);
      }
    });
  }, []);

  // Setup des intercepteurs console
  useEffect(() => {
    if (isSetupRef.current) return;
    
    // Charger les logs existants
    loadStoredLogs();

    // Sauvegarder les méthodes originales
    originalConsoleMethods.current = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };

    // Intercepter les méthodes console
    const interceptConsole = (level: ConsoleLog['level']) => {
      const original = originalConsoleMethods.current![level];
      
      return (...args: any[]) => {
        // Éviter les boucles infinies en filtrant nos propres logs
        const firstArg = args[0];
        if (typeof firstArg === 'string' && (
          firstArg.includes('Impossible de sauvegarder les logs') ||
          firstArg.includes('Erreur lors du chargement des logs') ||
          firstArg.includes('CONSOLE_LOGGER')
        )) {
          original(...args);
          return;
        }
        
        // Ajouter le log à notre collection
        addLog(level, args);
        
        // Appeler la méthode originale
        original(...args);
      };
    };

    // Appliquer les intercepteurs
    console.log = interceptConsole('log');
    console.error = interceptConsole('error');
    console.warn = interceptConsole('warn');
    console.info = interceptConsole('info');
    console.debug = interceptConsole('debug');

    isSetupRef.current = true;

    // Nettoyage lors du démontage
    return () => {
      if (originalConsoleMethods.current) {
        console.log = originalConsoleMethods.current.log;
        console.error = originalConsoleMethods.current.error;
        console.warn = originalConsoleMethods.current.warn;
        console.info = originalConsoleMethods.current.info;
        console.debug = originalConsoleMethods.current.debug;
      }
      isSetupRef.current = false;
    };
  }, [addLog, loadStoredLogs]);

  // Fonction pour obtenir les logs formatés pour GitHub
  const getFormattedLogs = useCallback(() => {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('fr-FR');
      return `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}`;
    });
  }, [logs]);

  // Fonction pour filtrer les logs selon leur pertinence
  const getRelevantLogs = useCallback((filterLevel?: 'error' | 'warn') => {
    if (!filterLevel) return logs;
    return logs.filter(log => log.level === filterLevel);
  }, [logs]);

  return {
    logs,
    logsCount: logs.length,
    getFormattedLogs,
    getRelevantLogs,
  };
};

// Interface pour le formulaire de rapport de bug
const bugReportFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  type: z.enum(["interface", "performance", "functionality", "crash", "other"], {
    required_error: "Le type de bug est requis",
  }),
  priority: z.enum(["low", "medium", "high", "critical"], {
    required_error: "La priorité est requise",
  }),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
});

type BugReportFormData = z.infer<typeof bugReportFormSchema>;

// Options de traduction pour les dropdowns
const bugTypeOptions = [
  { value: "interface", label: "Interface" },
  { value: "performance", label: "Performance" },
  { value: "functionality", label: "Fonctionnalité" },
  { value: "crash", label: "Crash" },
  { value: "other", label: "Autre" },
] as const;

const bugPriorityOptions = [
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
] as const;

// Composant pour l'aperçu des logs
function LogsPreview({ logs, isVisible }: { logs: ConsoleLog[], isVisible: boolean }) {
  if (!isVisible || logs.length === 0) return null;

  const recentLogs = logs.slice(-20); // Afficher les 20 derniers logs
  
  const getLogIcon = (level: ConsoleLog['level']) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      case 'debug': return '🟣';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-muted/50 border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="h-4 w-4" />
        <Label className="text-sm font-medium">
          Aperçu des logs console (20 derniers)
        </Label>
      </div>
      
      <ScrollArea className="h-32 w-full">
        <div className="space-y-1">
          {recentLogs.map((log, index) => (
            <div key={index} className="text-xs font-mono bg-background p-2 rounded border">
              <div className="flex items-start gap-2">
                <span>{getLogIcon(log.level)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold uppercase">{log.level}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                  </div>
                  <div className="break-words text-foreground mt-1">
                    {log.message.length > 100 ? 
                      `${log.message.substring(0, 100)}...` : 
                      log.message
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogsPreview, setShowLogsPreview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth() as { user: User | null; isLoading: boolean; isAuthenticated: boolean };
  
  // Utilisation du hook de collecte des logs
  const { logs, logsCount, getFormattedLogs, getRelevantLogs } = useConsoleLogger();

  const form = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: undefined,
      priority: undefined,
      stepsToReproduce: "",
      expectedBehavior: "",
      actualBehavior: "",
    },
  });

  const submitBugReportMutation = useMutation({
    mutationFn: async (data: InsertBugReport) => {
      return apiRequest("POST", "/api/bug-reports", data);
    },
    onSuccess: () => {
      toast({
        title: "Rapport envoyé",
        description: "Votre rapport de bug a été envoyé avec succès. Merci pour votre retour !",
        variant: "default",
      });
      form.reset();
      setIsOpen(false);
      setShowLogsPreview(false);
    },
    onError: (error) => {
      console.error("Erreur lors de l'envoi du rapport de bug:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi du rapport. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BugReportFormData) => {
    // Collecter automatiquement les informations du système avec logs console
    const formattedLogs = getFormattedLogs();
    const errorLogs = getRelevantLogs('error');
    const warnLogs = getRelevantLogs('warn');
    
    const automaticData: InsertBugReport = {
      ...data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: user?.id || undefined,
      userRole: user?.role || undefined,
      timestamp: new Date(),
      consoleLogs: formattedLogs,
    };

    submitBugReportMutation.mutate(automaticData);
  };

  // Réinitialiser le formulaire à la fermeture
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setShowLogsPreview(false);
    }
  }, [isOpen, form]);

  // Déterminer la couleur du badge en fonction du nombre de logs d'erreur
  const errorCount = getRelevantLogs('error').length;
  const warnCount = getRelevantLogs('warn').length;
  const badgeVariant = errorCount > 0 ? 'destructive' : warnCount > 0 ? 'secondary' : 'outline';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 gap-2"
          data-testid="bug-report-trigger"
        >
          <Bug className="h-4 w-4" />
          <span>Reporter un bug</span>
          <div className="flex items-center gap-1 ml-1">
            <Badge variant="secondary">Alpha</Badge>
            {logsCount > 0 && (
              <Badge variant={badgeVariant} className="text-xs" data-testid="logs-count-badge">
                <Terminal className="h-3 w-3 mr-1" />
                {logsCount}
              </Badge>
            )}
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="bug-report-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Signaler un bug - Phase Alpha
            <Badge variant="secondary" className="ml-2">
              Alpha
            </Badge>
            {logsCount > 0 && (
              <Badge variant={badgeVariant} className="ml-1" data-testid="dialog-logs-count">
                <Terminal className="h-3 w-3 mr-1" />
                {logsCount} logs
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à améliorer l'application en signalant les problèmes que vous rencontrez.
            Toutes les informations techniques et {logsCount} logs console seront collectés automatiquement.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Titre du bug - Requis */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du bug *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Décrivez brièvement le problème"
                      data-testid="input-bug-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description - Requis */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description détaillée *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez le problème en détail..."
                      className="min-h-[100px]"
                      data-testid="textarea-bug-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type de bug - Requis */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de bug *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-bug-type">
                        <SelectValue placeholder="Sélectionnez le type de bug" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bugTypeOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          data-testid={`select-bug-type-${option.value}`}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priorité - Requis */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-bug-priority">
                        <SelectValue placeholder="Sélectionnez la priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bugPriorityOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          data-testid={`select-bug-priority-${option.value}`}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Étapes pour reproduire - Optionnel */}
            <FormField
              control={form.control}
              name="stepsToReproduce"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Étapes pour reproduire (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="1. Aller sur la page..."
                      className="min-h-[80px]"
                      data-testid="textarea-steps-to-reproduce"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comportement attendu - Optionnel */}
            <FormField
              control={form.control}
              name="expectedBehavior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comportement attendu (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Que devrait-il se passer ?"
                      className="min-h-[60px]"
                      data-testid="textarea-expected-behavior"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comportement réel - Optionnel */}
            <FormField
              control={form.control}
              name="actualBehavior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comportement réel (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Que se passe-t-il réellement ?"
                      className="min-h-[60px]"
                      data-testid="textarea-actual-behavior"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section d'aperçu des logs console */}
            {logsCount > 0 && (
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                  data-testid="logs-preview-toggle"
                  onClick={() => setShowLogsPreview(!showLogsPreview)}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    <span className="font-medium">
                      Logs console collectés ({logsCount})
                    </span>
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {errorCount} erreur{errorCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {warnCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {warnCount} avertissement{warnCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {showLogsPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <LogsPreview logs={logs} isVisible={showLogsPreview} />
                </CollapsibleContent>
              </Collapsible>
            )}

            <Separator />

            {/* Informations automatiques */}
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm font-medium">Informations collectées automatiquement :</Label>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• URL actuelle : {window.location.href}</li>
                <li>• Navigateur : {navigator.userAgent.split(' ')[0]}</li>
                <li>• Timestamp : {new Date().toLocaleString('fr-FR')}</li>
                {user && (
                  <>
                    <li>• Utilisateur : {user.email}</li>
                    <li>• Rôle : {user.role}</li>
                  </>
                )}
                <li>• Logs console : {logsCount} entrées collectées</li>
                {errorCount > 0 && (
                  <li className="text-destructive">• Erreurs console : {errorCount}</li>
                )}
                {warnCount > 0 && (
                  <li className="text-yellow-600">• Avertissements : {warnCount}</li>
                )}
              </ul>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={submitBugReportMutation.isPending}
                data-testid="button-cancel"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitBugReportMutation.isPending}
                data-testid="button-submit"
              >
                {submitBugReportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Envoyer le rapport
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}