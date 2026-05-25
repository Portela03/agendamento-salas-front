import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  FlaskConical,
  GraduationCap,
  Mic2,
  PencilLine,
  RefreshCcw,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import {
  createClass,
  deleteClass,
  listClassesPaginated,
  updateClass,
  type ClassItem,
  type ClassStatus,
  type ClassType,
} from '../services/classService';
import { Pagination } from '../components/Pagination';

type Feedback = { type: 'success' | 'error'; text: string } | null;

type FormState = {
  name: string;
  description: string;
  capacity: string;
  type: ClassType;
  status: ClassStatus;
};

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  capacity: '',
  type: 'SALA',
  status: 'DISPONIVEL',
};

function typeLabel(type: ClassType) {
  if (type === 'LABORATORIO') return 'Laboratório';
  if (type === 'AUDITORIO') return 'Auditório';
  return 'Sala';
}

function TypeIcon({ type }: { type: ClassType }) {
  if (type === 'LABORATORIO') return <FlaskConical className="h-4 w-4" />;
  if (type === 'AUDITORIO') return <Mic2 className="h-4 w-4" />;
  return <GraduationCap className="h-4 w-4" />;
}

export default function ClassManagementPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isCapacityFocused, setIsCapacityFocused] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const capacityDisplay = isCapacityFocused
    ? form.capacity
    : form.capacity
      ? `${form.capacity} pessoas`
      : '';

  const isEditing = Boolean(editingId);

  const errors = useMemo(() => {
    const parsedCapacity = parseInt(form.capacity, 10);
    return {
      name: form.name.trim().length < 2 ? 'Nome obrigatório (mínimo 2 caracteres).' : '',
      capacity:
        !Number.isInteger(parsedCapacity) || parsedCapacity < 1
          ? 'Capacidade obrigatória (inteiro mínimo 1).'
          : '',
    };
  }, [form.name, form.capacity]);

  const hasErrors = Boolean(errors.name || errors.capacity);

  async function loadData(showError = true, currentPage = page) {    
    try {
      setLoadingList(true);
      const data = await listClassesPaginated(onlyAvailable, currentPage, 8);
      setClasses(data.data);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch {
      if (showError) setFeedback({ type: 'error', text: 'Não foi possível carregar as salas.' });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    setPage(1);
    void loadData(true, 1);
  }, [onlyAvailable]);

  function onChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setSubmitted(false);
  }

  function handleEdit(item: ClassItem) {
    setEditingId(item.id);
    setSubmitted(false);
    setFeedback(null);

    setForm({
      name: item.name ?? '',
      description: item.description ?? '',
      capacity: String(item.capacity ?? ''),
      type: (item.type as ClassType) ?? 'SALA',
      status: (item.status as ClassStatus) ?? 'DISPONIVEL',
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFeedback(null);

    if (hasErrors) return;

    const payloadBase = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      capacity: parseInt(form.capacity, 10),
      type: form.type,
    };

    try {
      setSaving(true);

      if (isEditing && editingId) {
        await updateClass(editingId, { ...payloadBase, status: form.status });
        setFeedback({ type: 'success', text: 'Sala atualizada com sucesso.' });
      } else {
        await createClass(payloadBase);
        setFeedback({ type: 'success', text: 'Sala cadastrada com sucesso.' });
      }

      resetForm();
      await loadData(false);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Erro ao salvar sala.';
      setFeedback({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteClass(deleteTarget.id);
      setFeedback({ type: 'success', text: 'Sala excluída com sucesso.' });

      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await loadData(false);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Erro ao excluir sala.';
      setFeedback({ type: 'error', text: message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container py-8 space-y-8">
        <div className="rounded-[32px] border border-brand-teal/10 bg-white/85 p-8 shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge className="w-fit" variant="default">
                Área do coordenador
              </Badge>
              <div>
                <h1 className="font-serif text-3xl text-brand-ink">Gerenciamento de Salas</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cadastre, visualize e edite classes disponíveis para reserva.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setOnlyAvailable((v) => !v)}>
                {onlyAvailable ? 'Mostrando disponíveis' : 'Apenas disponíveis'}
              </Button>
              <Button variant="secondary" onClick={() => void loadData()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2 rounded-[28px] border border-brand-teal/10 bg-white/85 p-6 shadow-panel">
            <h2 className="text-xl font-bold text-brand-ink">{isEditing ? 'Editar sala' : 'Nova sala'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha os campos para {isEditing ? 'atualizar' : 'cadastrar'}.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-ink">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  placeholder="Ex: Sala 101"
                  className={submitted && errors.name ? 'border-red-500 focus-visible:ring-red-200' : ''}
                />
                {submitted && errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-ink">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal/20"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-ink">Capacidade *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={capacityDisplay}
                  onFocus={() => setIsCapacityFocused(true)}
                  onBlur={() => setIsCapacityFocused(false)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    onChange('capacity', digits);
                  }}
                  placeholder="Ex: 40"
                  className={submitted && errors.capacity ? 'border-red-500 focus-visible:ring-red-200' : ''}
                />
                {submitted && errors.capacity && <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-ink">Tipo *</label>
                <Select value={form.type} onChange={(e) => onChange('type', e.target.value as ClassType)}>
                  <option value="LABORATORIO">LABORATORIO</option>
                  <option value="SALA">SALA</option>
                  <option value="AUDITORIO">AUDITORIO</option>
                </Select>
              </div>

              {isEditing && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-brand-ink">Status *</label>
                  <Select value={form.status} onChange={(e) => onChange('status', e.target.value as ClassStatus)}>
                    <option value="DISPONIVEL">DISPONIVEL</option>
                    <option value="INDISPONIVEL">INDISPONIVEL</option>
                  </Select>
                </div>
              )}

              {feedback && (
                <p className={`text-sm ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {feedback.text}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : isEditing ? 'Atualizar sala' : 'Cadastrar sala'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar edição
                  </Button>
                )}
              </div>
            </form>
          </section>

          <section className="lg:col-span-3 rounded-[28px] border border-brand-teal/10 bg-white/85 p-6 shadow-panel">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-teal" />
              <h2 className="text-xl font-bold text-brand-ink">Salas cadastradas</h2>
            </div>

            {loadingList ? (
              <p className="text-sm text-muted-foreground">Carregando salas...</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sala encontrada.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {classes.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-brand-teal/10 bg-gradient-to-r from-white to-brand-mist/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-brand-ink">{item.name}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          item.status === 'DISPONIVEL'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.status ?? 'INDISPONIVEL'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p className="inline-flex items-center gap-2">
                        <TypeIcon type={item.type} />
                        {typeLabel(item.type)}
                      </p>
                      <p>Capacidade: {item.capacity}</p>
                      <p>Descrição: {item.description?.trim() ? item.description : '—'}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingList && classes.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  void loadData(true, p);
                }}
              />
            )}
          </section>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-brand-ink">Confirmar exclusão</h3>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Tem certeza que deseja excluir a sala <strong>{deleteTarget.name}</strong>?
                  <br />
                  Todas as reservas dela serão apagadas no processo.
                </p>

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDeleteConfirmed()} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
                  </Button>
                  <Button type="button" onClick={() => setDeleteTarget(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
