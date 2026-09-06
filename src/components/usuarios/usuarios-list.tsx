"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ABAS, type NivelPermissao, type Permissoes } from "@/lib/abas";
import { cn } from "@/lib/utils";
import type { PerfilUsuario, StatusUsuario, Unidade, Usuario, UsuarioUnidade } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAPEL_LABELS: Record<PerfilUsuario, string> = {
  administrador: "Administrador",
  gerente: "Gerente",
  atendente: "Atendente",
};

const STATUS_LABELS: Record<StatusUsuario, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  inativo: "Inativo",
};

function badgeStatus(status: StatusUsuario) {
  if (status === "ativo") return "success" as const;
  if (status === "pendente") return "warning" as const;
  return "destructive" as const;
}

function ordemUsuarios(a: Usuario, b: Usuario) {
  if (a.status === "pendente" && b.status !== "pendente") return -1;
  if (b.status === "pendente" && a.status !== "pendente") return 1;
  return a.nome.localeCompare(b.nome);
}

export function UsuariosList({
  usuarioAtualId,
  usuarios: usuariosIniciais,
  unidades,
  vinculos: vinculosIniciais,
}: {
  usuarioAtualId: string;
  usuarios: Usuario[];
  unidades: Unidade[];
  vinculos: UsuarioUnidade[];
}) {
  const [usuarios, setUsuarios] = React.useState(usuariosIniciais);
  const [vinculos, setVinculos] = React.useState(vinculosIniciais);
  const [busca, setBusca] = React.useState("");
  const [editando, setEditando] = React.useState<Usuario | null>(null);

  const pendentes = usuarios.filter((u) => u.status === "pendente").length;

  const buscaNormalizada = busca.trim().toLowerCase();
  const usuariosFiltrados = usuarios
    .filter(
      (u) =>
        !buscaNormalizada ||
        u.nome.toLowerCase().includes(buscaNormalizada) ||
        u.email.toLowerCase().includes(buscaNormalizada)
    )
    .sort(ordemUsuarios);

  function unidadesDoUsuario(usuarioId: string) {
    const ids = new Set(vinculos.filter((v) => v.usuario_id === usuarioId).map((v) => v.unidade_id));
    return unidades.filter((u) => ids.has(u.id));
  }

  function aoSalvar(atualizado: Usuario, unidadesIds: string[]) {
    setUsuarios((atual) => atual.map((u) => (u.id === atualizado.id ? atualizado : u)));
    setVinculos((atual) => [
      ...atual.filter((v) => v.usuario_id !== atualizado.id),
      ...unidadesIds.map((unidade_id) => ({ usuario_id: atualizado.id, unidade_id })),
    ]);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">
          {pendentes > 0
            ? `${pendentes} cadastro${pendentes === 1 ? "" : "s"} aguardando aprovação.`
            : "Gerencie quem acessa o sistema, com quais papel e unidades."}
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail"
          className="pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuariosFiltrados.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{PAPEL_LABELS[u.perfil]}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {unidadesDoUsuario(u.id).map((un) => (
                      <Badge key={un.id} variant="outline">
                        {un.nome}
                      </Badge>
                    ))}
                    {unidadesDoUsuario(u.id).length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhuma</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={badgeStatus(u.status)}>{STATUS_LABELS[u.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setEditando(u)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {usuariosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={editando !== null} onOpenChange={(open) => !open && setEditando(null)}>
        <SheetContent className="flex flex-col gap-0 overflow-y-auto p-0">
          {editando && (
            <PainelEdicao
              key={editando.id}
              usuario={editando}
              unidades={unidades}
              unidadesSelecionadasIds={unidadesDoUsuario(editando.id).map((u) => u.id)}
              ehProprioUsuario={editando.id === usuarioAtualId}
              autorId={usuarioAtualId}
              onSalvar={aoSalvar}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PainelEdicao({
  usuario,
  unidades,
  unidadesSelecionadasIds,
  ehProprioUsuario,
  autorId,
  onSalvar,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  unidadesSelecionadasIds: string[];
  ehProprioUsuario: boolean;
  autorId: string;
  onSalvar: (usuario: Usuario, unidadesIds: string[]) => void;
}) {
  const [telefone, setTelefone] = React.useState(usuario.telefone ?? "");
  const [perfil, setPerfil] = React.useState<PerfilUsuario>(usuario.perfil);
  const [status, setStatus] = React.useState<StatusUsuario>(usuario.status);
  const [permissoes, setPermissoes] = React.useState<Permissoes>(usuario.permissoes ?? {});
  const [unidadesIds, setUnidadesIds] = React.useState<Set<string>>(
    new Set(unidadesSelecionadasIds)
  );
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  function alternarUnidade(id: string, marcado: boolean) {
    setUnidadesIds((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  async function salvar() {
    setErro(null);

    if (status === "ativo" && unidadesIds.size === 0) {
      setErro("Marque ao menos uma unidade antes de ativar.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();

    const { data: atualizado, error } = await supabase
      .from("usuarios")
      .update({ telefone: telefone || null, perfil, status, permissoes })
      .eq("id", usuario.id)
      .select("*")
      .single();

    if (error || !atualizado) {
      setSalvando(false);
      setErro("Não foi possível salvar. Tente novamente.");
      return;
    }

    await supabase.from("usuario_unidades").delete().eq("usuario_id", usuario.id);
    if (unidadesIds.size > 0) {
      await supabase
        .from("usuario_unidades")
        .insert([...unidadesIds].map((unidade_id) => ({ usuario_id: usuario.id, unidade_id })));
    }

    await supabase.from("log_acessos").insert({
      alvo_id: usuario.id,
      autor_id: autorId,
      acao: status !== usuario.status ? `status:${usuario.status}->${status}` : "atualizou_acesso",
      antes: { perfil: usuario.perfil, status: usuario.status, unidades: unidadesSelecionadasIds },
      depois: { perfil, status, unidades: [...unidadesIds] },
    });

    setSalvando(false);
    toast.success("Acesso atualizado.");
    onSalvar(atualizado, [...unidadesIds]);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{usuario.nome}</SheetTitle>
        <SheetDescription>{usuario.email}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Papel</Label>
          <Select
            value={perfil}
            onValueChange={(v) => setPerfil(v as PerfilUsuario)}
            disabled={ehProprioUsuario}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="atendente">Atendente</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusUsuario)}
            disabled={ehProprioUsuario}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {ehProprioUsuario && (
            <p className="text-xs text-muted-foreground">
              Papel e status ficam bloqueados na sua própria conta.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Unidades</Label>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            {unidades.map((un) => (
              <label key={un.id} className="flex items-center justify-between gap-2 text-sm">
                {un.nome}
                <Switch
                  checked={unidadesIds.has(un.id)}
                  onCheckedChange={(checked) => alternarUnidade(un.id, checked)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Acesso por aba</Label>
          {perfil === "administrador" ? (
            <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              Administrador tem acesso completo a todas as abas — não dá pra restringir.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {ABAS.map((aba) => (
                <div key={aba.slug} className="flex items-center justify-between gap-2 p-3 text-sm">
                  {aba.label}
                  <NivelToggle
                    nivel={permissoes[aba.slug] ?? "nenhum"}
                    onChange={(nivel) =>
                      setPermissoes((atual) => ({ ...atual, [aba.slug]: nivel }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>

      <SheetFooter>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </SheetFooter>
    </>
  );
}

const NIVEIS: { valor: NivelPermissao; label: string }[] = [
  { valor: "nenhum", label: "Nenhum" },
  { valor: "ver", label: "Ver" },
  { valor: "editar", label: "Editar" },
];

function NivelToggle({
  nivel,
  onChange,
}: {
  nivel: NivelPermissao;
  onChange: (nivel: NivelPermissao) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-0.5">
      {NIVEIS.map((n) => (
        <button
          key={n.valor}
          type="button"
          onClick={() => onChange(n.valor)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            nivel === n.valor
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}
