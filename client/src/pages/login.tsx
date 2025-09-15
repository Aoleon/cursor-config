import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Wrench, Lock, User, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Schema de validation pour le formulaire de login basique
const basicLoginSchema = z.object({
  username: z.string().min(1, "Le nom d'utilisateur est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type BasicLoginData = z.infer<typeof basicLoginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isBasicLoading, setIsBasicLoading] = useState(false);

  const form = useForm<BasicLoginData>({
    resolver: zodResolver(basicLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Mutation pour l'authentification basique
  const basicLoginMutation = useMutation({
    mutationFn: async (data: BasicLoginData) => {
      return apiRequest("POST", "/api/login/basic", data);
    },
    onSuccess: () => {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans Saxium !",
      });
      // Rediriger directement vers le dashboard sans attendre la validation de session
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiants incorrects",
        variant: "destructive",
      });
    },
  });

  const onBasicSubmit = async (data: BasicLoginData) => {
    setIsBasicLoading(true);
    try {
      await basicLoginMutation.mutateAsync(data);
    } finally {
      setIsBasicLoading(false);
    }
  };

  const handleRobinswoodLogin = () => {
    // Redirection vers l'authentification OIDC Robinswood
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Wrench className="text-on-primary text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Saxium</h1>
              <p className="text-sm text-[#ffffff]">Connexion</p>
            </div>
          </div>
          <p className="text-on-surface">
            Accédez à votre espace de travail
          </p>
        </div>

        {/* Authentification basique */}
        <Card className="border-0 shadow-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-primary" />
              <span>Connexion Basique</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onBasicSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'utilisateur</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="admin"
                            className="pl-10"
                            data-testid="input-username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="admin"
                            className="pl-10"
                            data-testid="input-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isBasicLoading || basicLoginMutation.isPending}
                  data-testid="button-login-basic"
                >
                  {(isBasicLoading || basicLoginMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary mr-2"></div>
                      Connexion...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Hint pour le développement */}
            <div className="mt-4 p-3 bg-surface-muted rounded-lg">
              <p className="text-xs text-on-surface-muted">
                <strong>Développement:</strong> Utilisez admin/admin pour la connexion basique
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Séparateur */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* Authentification Robinswood (OIDC) */}
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <Button
              onClick={handleRobinswoodLogin}
              variant="outline"
              className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-on-primary"
              data-testid="button-login-robinswood"
            >
              <div className="w-5 h-5 mr-2 bg-primary rounded flex items-center justify-center">
                <span className="text-on-primary text-xs font-bold">R</span>
              </div>
              Connexion Robinswood
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-2">
              Authentification via le compte Robinswood
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2025 Saxium - Solution de gestion d'entreprise
          </p>
        </div>
      </div>
    </div>
  );
}