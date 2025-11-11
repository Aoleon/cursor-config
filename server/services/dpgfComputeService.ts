import Decimal from "decimal.js-light";
import type { ChiffrageElement, Offer, Ao, AoLot } from "@shared/schema";
import { ValidationError } from "../utils/error-handler";

// Configuration pour les calculs financiers précis
Decimal.config({
  precision: 10,
  rounding: Decimal.ROUND_HALF_UP,
  toExpPos: 9e15,
  toExpNeg: -9e15,
});

export interface DpgfLineItem {
  id: string;
  position: number;
  lot?: string;
  lotNumber?: number;
  category: string;
  subcategory?: string;
  designation: string;
  unit: string;
  quantity: Decimal;
  unitPrice: Decimal;
  coefficient: Decimal;
  marginPercentage: Decimal;
  supplier?: string;
  supplierRef?: string;
  isOptional: boolean;
  notes?: string;
  
  // Calculs automatiques
  baseCost: Decimal;           // qty * unitPrice * coefficient
  marginAmount: Decimal;       // baseCost * (marginPercentage / 100)
  sellUnitPriceHT: Decimal;    // unitPrice * coefficient * (1 + marginPercentage / 100)
  lineTotalHT: Decimal;        // qty * sellUnitPriceHT
}

export interface DpgfGroupedData {
  lots: DpgfLotGroup[];
  totals: DpgfTotals;
  metadata: DpgfMetadata;
}

export interface DpgfLotGroup {
  lotNumber: number;
  lotName: string;
  categories: DpgfCategoryGroup[];
  subtotalHT: Decimal;
}

export interface DpgfCategoryGroup {
  category: string;
  categoryLabel: string;
  items: DpgfLineItem[];
  subtotalHT: Decimal;
}

export interface DpgfTotals {
  totalHT: Decimal;
  tvaPercentage: Decimal;
  totalTVA: Decimal;
  totalTTC: Decimal;
  totalMarginAmount: Decimal;
  totalMarginPercentage: Decimal;
}

export interface DpgfMetadata {
  offerId: string;
  offerReference?: string;
  client?: string;
  aoReference?: string;
  location?: string;
  generatedAt: Date;
  itemCount: number;
  optionalItemsIncluded: boolean;
  version: string;
}

export class DpgfComputeService {
  /**
   * Calcule et structure les données DPGF depuis les éléments de chiffrage
   */
  static async computeDpgf(
    elements: ChiffrageElement[],
    options: {
      includeOptional?: boolean;
      tvaPercentage?: number;
      offer?: Offer;
      ao?: Ao;
      aoLots?: AoLot[];
    } = {}
  ): Promise<DpgfGroupedData> {
    const {
      includeOptional = false,
      tvaPercentage = 20,
      offer,
      ao,
      aoLots = []
    } = options;

    // Filtrer les éléments optionnels si nécessaire
    const filteredElements = elements.filter(el => 
      includeOptional || !el.isOptional
    );

    if (filteredElements.length === 0) {
      throw new ValidationError("Aucun élément de chiffrage disponible pour le calcul DPGF");
    }

    // Transformer en lignes avec calculs
    const lineItems = this.computeLineItems(filteredElements);

    // Grouper par lot puis par catégorie
    const groupedData = this.groupByLotsAndCategories(lineItems, aoLots);

    // Calculer les totaux globaux
    const totals = this.computeTotals(lineItems, tvaPercentage);

    // Métadonnées
    const metadata: DpgfMetadata = {
      offerId: offer?.id || "unknown",
      offerReference: offer?.reference,
      client: offer?.client,
      aoReference: ao?.reference,
      location: ao?.location || offer?.location,
      generatedAt: new Date(),
      itemCount: lineItems.length,
      optionalItemsIncluded: includeOptional,
      version: "1.0"
    };

    return {
      lots: groupedData,
      totals,
      metadata
    };
  }

  /**
   * Calcule les valeurs financières pour chaque ligne
   */
  private static computeLineItems(elements: ChiffrageElement[]): DpgfLineItem[] {
    return elements.map((element, index) => {
      // Conversion en Decimal pour précision
      const quantity = new Decimal(element.quantity || "0");
      const unitPrice = new Decimal(element.unitPrice || "0");
      const coefficient = new Decimal(element.coefficient || "1");
      const marginPercentage = new Decimal(element.marginPercentage || "20");

      // Calculs selon les formules DPGF
      const baseCost = quantity.mul(unitPrice).mul(coefficient);
      const marginDecimal = marginPercentage.div(100);
      const marginAmount = baseCost.mul(marginDecimal);
      const sellUnitPriceHT = unitPrice.mul(coefficient).mul(marginDecimal.plus(1));
      const lineTotalHT = quantity.mul(sellUnitPriceHT);

      return {
        id: element.id,
        position: element.position || index,
        lot: element.lotId || undefined,
        lotNumber: element.lotNumber || 1, // Attribution du lotNumber depuis l'élément ou défaut 1
        category: element.category,
        subcategory: element.subcategory || "",
        designation: element.designation,
        unit: element.unit,
        quantity,
        unitPrice,
        coefficient,
        marginPercentage,
        supplier: element.supplier || undefined,
        supplierRef: element.supplierRef || undefined,
        isOptional: element.isOptional || false,
        notes: element.notes || undefined,
        
        baseCost,
        marginAmount,
        sellUnitPriceHT,
        lineTotalHT
      };
    });
  }

  /**
   * Groupe les éléments par lots puis par catégories
   */
  private static groupByLotsAndCategories(
    items: DpgfLineItem[], 
    aoLots: AoLot[] = []
  ): DpgfLotGroup[] {
    // Créer un mapping des lots pour le référencement
    const lotsMap = new Map(aoLots.map(lot => [lot.numero, lot]));

    // Grouper par lot d'abord
    const itemsByLot = new Map<number, DpgfLineItem[]>();
    
    items.forEach(item => {
      // Déterminer le numéro de lot (par défaut lot 1 si non spécifié)
      const lotNumber = item.lotNumber || 1;
      if (!itemsByLot.has(lotNumber)) {
        itemsByLot.set(lotNumber, []);
      }
      itemsByLot.get(lotNumber)!.push(item);
    });

    // Traiter chaque lot
    const lotGroups: DpgfLotGroup[] = [];
    
    itemsByLot.forEach((lotItems: DpgfLineItem[], lotNumber: number) => {
      const lot = lotsMap.get(lotNumber);
      const lotName = lot?.designation || `Lot ${lotNumber.toString()}`;

      // Grouper par catégorie au sein du lot
      const categoriesMap = new Map<string, DpgfLineItem[]>();
      
      lotItems.forEach((item: DpgfLineItem) => {
        const category = item.category;
        if (!categoriesMap.has(category)) {
          categoriesMap.set(category, []);
        }
        categoriesMap.get(category)!.push(item);
      });

      // Créer les groupes de catégories
      const categoryGroups: DpgfCategoryGroup[] = [];
      categoriesMap.forEach((categoryItems: DpgfLineItem[], category: string) => {
        const subtotalHT = categoryItems.reduce(
          (sum: Decimal, item: DpgfLineItem) => sum.plus(item.lineTotalHT),
          new Decimal(0)
        );

        categoryGroups.push({
          category,
          categoryLabel: this.getCategoryLabel(category),
          items: categoryItems.sort((a: DpgfLineItem, b: DpgfLineItem) => a.position - b.position),
          subtotalHT
        });
      });

      // Trier les catégories par nom
      categoryGroups.sort((a: DpgfCategoryGroup, b: DpgfCategoryGroup) => a.categoryLabel.localeCompare(b.categoryLabel));

      // Calculer le sous-total du lot
      const lotSubtotalHT = categoryGroups.reduce(
        (sum: Decimal, cat: DpgfCategoryGroup) => sum.plus(cat.subtotalHT),
        new Decimal(0)
      );

      lotGroups.push({
        lotNumber,
        lotName,
        categories: categoryGroups,
        subtotalHT: lotSubtotalHT
      });
    });

    // Trier les lots par numéro
    return lotGroups.sort((a: DpgfLotGroup, b: DpgfLotGroup) => a.lotNumber - b.lotNumber);
  }

  /**
   * Calcule les totaux globaux du DPGF
   */
  private static computeTotals(items: DpgfLineItem[], tvaPercentage: number): DpgfTotals {
    const totalHT = items.reduce((sum, item) => sum.plus(item.lineTotalHT), new Decimal(0));
    const totalMarginAmount = items.reduce((sum, item) => sum.plus(item.marginAmount), new Decimal(0));
    
    const tvaDecimal = new Decimal(tvaPercentage).div(100);
    const totalTVA = totalHT.mul(tvaDecimal);
    const totalTTC = totalHT.plus(totalTVA);
    
    // Calcul du pourcentage de marge global
    const totalCost = items.reduce((sum, item) => sum.plus(item.baseCost), new Decimal(0));
    const totalMarginPercentage = totalCost.greaterThan(0) 
      ? totalMarginAmount.div(totalCost).mul(100)
      : new Decimal(0);

    return {
      totalHT,
      tvaPercentage: new Decimal(tvaPercentage),
      totalTVA,
      totalTTC,
      totalMarginAmount,
      totalMarginPercentage
    };
  }

  /**
   * Convertit le code catégorie en libellé lisible
   */
  private static getCategoryLabel(category: string): string {
    const categoryLabels: Record<string, string> = {
      "menuiseries_exterieures": "Menuiseries extérieures",
      "menuiseries_interieures": "Menuiseries intérieures", 
      "main_oeuvre": "Main d'œuvre",
      "fournitures": "Fournitures",
      "transport": "Transport",
      "autres": "Autres prestations"
    };
    
    return categoryLabels[category] || category;
  }

  /**
   * Formate un Decimal en string avec 2 décimales
   */
  static formatCurrency(value: Decimal): string {
    return value.toFixed(2);
  }

  /**
   * Formate un Decimal en string avec gestion des unités
   */
  static formatQuantity(value: Decimal, decimals: number = 3): string {
    return value.toFixed(decimals);
  }

  /**
   * Sérialise les données DPGF pour stockage (conversion Decimal -> string)
   */
  static serializeForStorage(data: DpgfGroupedData): Record<string, unknown> {
    return {
      lots: data.lots.map(lot  => ({
        lotNumber: lot.lotNumber,
        lotName: lot.lotName,
        subtotalHT: this.formatCurrency(lot.subtotalHT),
        categories: lot.categories.map(cat  => ({
          category: cat.category,
          categoryLabel: cat.categoryLabel,
          subtotalHT: this.formatCurrency(cat.subtotalHT),
          items: cat.items.map(item  => ({
            id: item.id,
            position: item.position,
            category: item.category,
            subcategory: item.subcategory,
            designation: item.designation,
            unit: item.unit,
            quantity: this.formatQuantity(item.quantity),
            unitPrice: this.formatCurrency(item.unitPrice),
            coefficient: this.formatQuantity(item.coefficient, 2),
            marginPercentage: this.formatQuantity(item.marginPercentage, 2),
            supplier: item.supplier,
            supplierRef: item.supplierRef,
            isOptional: item.isOptional,
            notes: item.notes,
            baseCost: this.formatCurrency(item.baseCost),
            marginAmount: this.formatCurrency(item.marginAmount),
            sellUnitPriceHT: this.formatCurrency(item.sellUnitPriceHT),
            lineTotalHT: this.formatCurrency(item.lineTotalHT)
          }))
        }))
      })),
      totals: {
        totalHT: this.formatCurrency(data.totals.totalHT),
        tvaPercentage: this.formatQuantity(data.totals.tvaPercentage, 1),
        totalTVA: this.formatCurrency(data.totals.totalTVA),
        totalTTC: this.formatCurrency(data.totals.totalTTC),
        totalMarginAmount: this.formatCurrency(data.totals.totalMarginAmount),
        totalMarginPercentage: this.formatQuantity(data.totals.totalMarginPercentage, 1)
      },
      metadata: {
        ...data.metadata,
        generatedAt: data.metadata.generatedAt.toISOString() } });
  }
}