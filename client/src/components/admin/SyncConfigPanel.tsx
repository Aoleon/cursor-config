import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useSyncConfig } from '@/hooks/use-sync-config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function SyncConfigPanel() {
  const { config, isLoading, updateConfig, isUpdating } = useSyncConfig();
  const [isEnabled, setIsEnabled] = useState(false);
  const [cronExpression, setCronExpression] = useState('0 */6 * * *');

  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled);
      setCronExpression(config.cronExpression || '0 */6 * * *');
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      isEnabled,
      cronExpression,
    });
  };

  const hasChanges = config && (
    config.isEnabled !== isEnabled || 
    config.cronExpression !== cronExpression
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!config?.lastSyncStatus) return null;
    
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: typeof CheckCircle2 }> = {
      success: { variant: 'default', icon: CheckCircle2 },
      error: { variant: 'destructive', icon: XCircle },
      running: { variant: 'secondary', icon: Clock },
    };

    const status = variants[config.lastSyncStatus] || { variant: 'outline' as const, icon: AlertCircle };
    const Icon = status.icon;

    return (
      <Badge variant={status.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.lastSyncStatus}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synchronisation automatique OneDrive</CardTitle>
        <CardDescription>
          Configurez la synchronisation automatique des documents OneDrive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activer/Désactiver */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sync-enabled">Synchronisation automatique</Label>
            <p className="text-sm text-muted-foreground">
              Active la synchronisation périodique des documents OneDrive
            </p>
          </div>
          <Switch
            id="sync-enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            data-testid="switch-sync-enabled"
          />
        </div>

        {/* Expression Cron */}
        <div className="space-y-2">
          <Label htmlFor="cron-expression">Fréquence de synchronisation</Label>
          <Input
            id="cron-expression"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 */6 * * *"
            disabled={!isEnabled}
            data-testid="input-cron-expression"
          />
          <p className="text-xs text-muted-foreground">
            Expression cron (ex: '0 */6 * * *' pour toutes les 6 heures)
          </p>
        </div>

        {/* Dernière synchronisation */}
        {config && config.lastSyncAt && (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Dernière synchronisation</h4>
              {getStatusBadge()}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(config.lastSyncAt), 'PPp', { locale: fr })}
                </p>
              </div>
              {config.lastSyncResult?.totalAOs !== undefined && (
                <>
                  <div>
                    <p className="text-muted-foreground">AOs traités</p>
                    <p className="font-medium">{config.lastSyncResult.totalAOs}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Documents ajoutés</p>
                    <p className="font-medium text-green-600">
                      +{config.lastSyncResult.documentsAdded || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Documents mis à jour</p>
                    <p className="font-medium text-blue-600">
                      {config.lastSyncResult.documentsUpdated || 0}
                    </p>
                  </div>
                </>
              )}
              {config.lastSyncResult?.errors && config.lastSyncResult.errors.length > 0 && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Erreurs</p>
                  <p className="font-medium text-destructive">
                    {config.lastSyncResult.errors.length} erreur(s)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prochaine synchronisation */}
        {config && config.nextSyncAt && isEnabled && (
          <div className="rounded-lg border p-4">
            <h4 className="text-sm font-medium mb-2">Prochaine synchronisation</h4>
            <p className="text-sm">
              {format(new Date(config.nextSyncAt), 'PPp', { locale: fr })}
            </p>
          </div>
        )}

        {/* Bouton Sauvegarder */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          className="w-full"
          data-testid="button-save-sync-config"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer la configuration'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
