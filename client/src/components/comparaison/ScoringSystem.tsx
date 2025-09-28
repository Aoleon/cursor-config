import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Settings,
  Star,
  TrendingUp,
  Award,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  Trophy
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScoringCriteria {
  id: string;
  name: string;
  weight: number;
  maxPoints: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SupplierScore {
  supplierId: string;
  supplierName: string;
  criteriaScores: Record<string, number>;
  totalScore: number;
  weightedScore: number;
  rank: number;
}

interface ScoringSystemProps {
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    ocrData?: {
      totalAmountHT?: number;
      deliveryDelay?: number;
      qualityScore?: number;
      completenessScore?: number;
      requiresManualReview?: boolean;
    };
    analysisStats: {
      averageQuality: number;
      averageCompleteness: number;
    };
  }>;
  metrics?: {
    priceRange?: { min: number; max: number };
    deliveryRange?: { min: number; max: number };
  };
}

const DEFAULT_CRITERIA: ScoringCriteria[] = [
  {
    id: 'price',
    name: 'Prix compétitif',
    weight: 30,
    maxPoints: 100,
    icon: Target
  },
  {
    id: 'delivery',
    name: 'Délai de livraison',
    weight: 25,
    maxPoints: 100,
    icon: Zap
  },
  {
    id: 'quality',
    name: 'Qualité OCR',
    weight: 20,
    maxPoints: 100,
    icon: Award
  },
  {
    id: 'completeness',
    name: 'Complétude',
    weight: 15,
    maxPoints: 100,
    icon: CheckCircle
  },
  {
    id: 'reliability',
    name: 'Fiabilité analyse',
    weight: 10,
    maxPoints: 100,
    icon: TrendingUp
  }
];

export function ScoringSystem({ suppliers, metrics }: ScoringSystemProps) {
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(DEFAULT_CRITERIA);
  const [showSettings, setShowSettings] = useState(false);
  const [tempCriteria, setTempCriteria] = useState<ScoringCriteria[]>(DEFAULT_CRITERIA);

  // Fonction pour calculer le score d'un critère pour un fournisseur
  const calculateCriteriaScore = (supplierId: string, criteriaId: string): number => {
    const supplier = suppliers.find(s => s.supplierId === supplierId);
    if (!supplier) return 0;

    switch (criteriaId) {
      case 'price':
        if (!supplier.ocrData?.totalAmountHT || !metrics?.priceRange) return 0;
        // Score inversé : plus le prix est bas, plus le score est élevé
        const priceRange = metrics.priceRange.max - metrics.priceRange.min;
        if (priceRange === 0) return 100;
        const priceScore = 100 - ((supplier.ocrData.totalAmountHT - metrics.priceRange.min) / priceRange) * 100;
        return Math.max(0, Math.min(100, priceScore));

      case 'delivery':
        if (!supplier.ocrData?.deliveryDelay || !metrics?.deliveryRange) return 0;
        // Score inversé : plus le délai est court, plus le score est élevé
        const deliveryRange = metrics.deliveryRange.max - metrics.deliveryRange.min;
        if (deliveryRange === 0) return 100;
        const deliveryScore = 100 - ((supplier.ocrData.deliveryDelay - metrics.deliveryRange.min) / deliveryRange) * 100;
        return Math.max(0, Math.min(100, deliveryScore));

      case 'quality':
        return supplier.ocrData?.qualityScore || supplier.analysisStats.averageQuality || 0;

      case 'completeness':
        return supplier.ocrData?.completenessScore || supplier.analysisStats.averageCompleteness || 0;

      case 'reliability':
        // Score basé sur l'absence de révision manuelle nécessaire et la qualité
        const needsReview = supplier.ocrData?.requiresManualReview ? 0 : 50;
        const qualityBonus = (supplier.analysisStats.averageQuality || 0) * 0.5;
        return Math.min(100, needsReview + qualityBonus);

      default:
        return 0;
    }
  };

  // Calculer les scores pour tous les fournisseurs
  const supplierScores: SupplierScore[] = suppliers.map(supplier => {
    const criteriaScores: Record<string, number> = {};
    let totalScore = 0;
    let weightedScore = 0;
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    criteria.forEach(criterion => {
      const score = calculateCriteriaScore(supplier.supplierId, criterion.id);
      criteriaScores[criterion.id] = score;
      totalScore += score;
      weightedScore += (score * criterion.weight) / 100;
    });

    return {
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      criteriaScores,
      totalScore,
      weightedScore: totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0,
      rank: 0 // Sera calculé après tri
    };
  });

  // Trier par score pondéré et assigner les rangs
  supplierScores.sort((a, b) => b.weightedScore - a.weightedScore);
  supplierScores.forEach((score, index) => {
    score.rank = index + 1;
  });

  // Fonction pour obtenir la couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-blue-600 bg-blue-50";
    if (score >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // Fonction pour obtenir l'icône du rang
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2: return <Award className="h-4 w-4 text-gray-400" />;
      case 3: return <Star className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-sm font-medium">#{rank}</span>;
    }
  };

  // Sauvegarder les critères modifiés
  const saveCriteria = () => {
    setCriteria(tempCriteria);
    setShowSettings(false);
  };

  // Réinitialiser les critères
  const resetCriteria = () => {
    setTempCriteria(DEFAULT_CRITERIA);
  };

  return (
    <Card data-testid="card-scoring-system">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Système de notation
          </CardTitle>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-scoring-settings">
                <Settings className="h-4 w-4 mr-2" />
                Configurer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configuration du scoring</DialogTitle>
                <DialogDescription>
                  Ajustez les poids des critères d'évaluation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {tempCriteria.map((criterion, index) => (
                  <div key={criterion.id} className="space-y-2">
                    <Label htmlFor={`weight-${criterion.id}`}>
                      {criterion.name} ({criterion.weight}%)
                    </Label>
                    <Slider
                      id={`weight-${criterion.id}`}
                      min={0}
                      max={50}
                      step={5}
                      value={[criterion.weight]}
                      onValueChange={(value) => {
                        const newCriteria = [...tempCriteria];
                        newCriteria[index].weight = value[0];
                        setTempCriteria(newCriteria);
                      }}
                      data-testid={`slider-weight-${criterion.id}`}
                    />
                  </div>
                ))}
                <Separator />
                <div className="text-sm text-muted-foreground">
                  Total: {tempCriteria.reduce((sum, c) => sum + c.weight, 0)}%
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetCriteria} data-testid="button-reset-criteria">
                  Réinitialiser
                </Button>
                <Button onClick={saveCriteria} data-testid="button-save-criteria">
                  Appliquer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Résumé des critères */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Critères d'évaluation</h4>
          <div className="flex flex-wrap gap-2">
            {criteria.map(criterion => {
              const IconComponent = criterion.icon || Star;
              return (
                <Badge 
                  key={criterion.id} 
                  variant="outline" 
                  className="flex items-center gap-1"
                  data-testid={`badge-criteria-${criterion.id}`}
                >
                  <IconComponent className="h-3 w-3" />
                  {criterion.name} ({criterion.weight}%)
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Classement des fournisseurs */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Classement des fournisseurs</h4>
          <div className="hidden md:block">
            {supplierScores.map(score => (
            <div 
              key={score.supplierId} 
              className="border rounded-lg p-4"
              data-testid={`score-card-${score.supplierId}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getRankIcon(score.rank)}
                  <h5 className="font-medium">{score.supplierName}</h5>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score.weightedScore)}`}>
                  {score.weightedScore.toFixed(1)}/100
                </div>
              </div>
              
              {/* Détail des scores par critère */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {criteria.map(criterion => {
                  const criteriaScore = score.criteriaScores[criterion.id] || 0;
                  const IconComponent = criterion.icon || Star;
                  return (
                    <div 
                      key={criterion.id} 
                      className="flex items-center justify-between text-sm"
                      data-testid={`criteria-score-${score.supplierId}-${criterion.id}`}
                    >
                      <div className="flex items-center gap-1">
                        <IconComponent className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{criterion.name}</span>
                      </div>
                      <span className={`font-medium ${getScoreColor(criteriaScore)}`}>
                        {criteriaScore.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
          
          {/* Version mobile condensée pour le scoring */}
          <div className="md:hidden space-y-3">
            {supplierScores.map(score => (
              <div 
                key={score.supplierId} 
                className="border rounded-lg p-3"
                data-testid={`mobile-score-card-${score.supplierId}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRankIcon(score.rank)}
                    <h5 className="font-medium text-sm">{score.supplierName}</h5>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(score.weightedScore)}`}>
                    {score.weightedScore.toFixed(0)}/100
                  </div>
                </div>
                
                {/* Top 3 critères sur mobile */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {criteria.slice(0, 3).map(criterion => {
                    const criteriaScore = score.criteriaScores[criterion.id] || 0;
                    const IconComponent = criterion.icon || Star;
                    return (
                      <div 
                        key={criterion.id} 
                        className="text-center"
                        data-testid={`mobile-criteria-score-${score.supplierId}-${criterion.id}`}
                      >
                        <IconComponent className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                        <div className={`font-medium ${getScoreColor(criteriaScore)}`}>
                          {criteriaScore.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistiques du scoring */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {supplierScores.length > 0 ? supplierScores[0].weightedScore.toFixed(1) : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Meilleur score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {supplierScores.length > 0 
                  ? (supplierScores.reduce((sum, s) => sum + s.weightedScore, 0) / supplierScores.length).toFixed(1)
                  : '0'
                }
              </p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {supplierScores.filter(s => s.weightedScore >= 70).length}
              </p>
              <p className="text-xs text-muted-foreground">Score ≥ 70</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {criteria.reduce((sum, c) => sum + c.weight, 0)}%
              </p>
              <p className="text-xs text-muted-foreground">Poids total</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}