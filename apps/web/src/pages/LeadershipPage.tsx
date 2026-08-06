import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, FileText, LogOut, Pencil, UserRoundPlus, UsersRound, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, clearLeadershipToken } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { DEFAULT_OPERATIONAL_STORE, OPERATIONAL_STORES } from '../constants/stores';
import type {
  LeadershipEmployee,
  LeadershipEmployeeCreate,
  LeadershipEmployeeUpdate,
  LeadershipRecord,
  LeadershipRecordCreate,
  LeadershipRecordType
} from '../types';

const emptyEmployee: LeadershipEmployeeCreate = {
  name: '',
  store: DEFAULT_OPERATIONAL_STORE,
  position: ''
};

const recordLabels: Record<LeadershipRecordType, string> = {
  feedback: 'Feedback',
  advertencia: 'Advertência',
  suspensao: 'Suspensão',
  demissao: 'Demissão'
};

const recordStyles: Record<LeadershipRecordType, string> = {
  feedback: 'bg-lia-green/10 text-lia-green',
  advertencia: 'bg-amber-100 text-amber-800',
  suspensao: 'bg-orange-100 text-orange-800',
  demissao: 'bg-lia-red/10 text-lia-red'
};

export function LeadershipPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [employeeForm, setEmployeeForm] = useState<LeadershipEmployeeCreate>(emptyEmployee);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [recordForm, setRecordForm] = useState<LeadershipRecordCreate>({
    record_type: 'feedback',
    description: '',
    applied_at: new Date().toISOString().slice(0, 10)
  });
  const [recordSuccess, setRecordSuccess] = useState('');

  const session = useQuery({
    queryKey: ['leadership-me'],
    queryFn: api.leadershipMe,
    retry: false
  });

  const employees = useQuery({
    queryKey: ['leadership-employees'],
    queryFn: api.leadershipEmployees,
    enabled: session.isSuccess
  });

  const records = useQuery({
    queryKey: ['leadership-records'],
    queryFn: api.leadershipRecords,
    enabled: session.isSuccess
  });

  const activeEmployees = useMemo(
    () => (employees.data ?? []).filter((employee) => employee.active),
    [employees.data]
  );

  const createEmployee = useMutation({
    mutationFn: api.createLeadershipEmployee,
    onSuccess: (employee) => {
      setEmployeeForm(emptyEmployee);
      setSelectedEmployeeId(String(employee.id));
      setRecordSuccess('');
      queryClient.setQueryData<LeadershipEmployee[]>(['leadership-employees'], (current = []) => [
        employee,
        ...current.filter((item) => item.id !== employee.id)
      ]);
      queryClient.invalidateQueries({ queryKey: ['leadership-employees'] });
    }
  });

  const updateEmployee = useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: number; payload: LeadershipEmployeeUpdate }) =>
      api.updateLeadershipEmployee(employeeId, payload),
    onSuccess: (employee) => {
      queryClient.setQueryData<LeadershipEmployee[]>(['leadership-employees'], (current = []) =>
        current.map((item) => (item.id === employee.id ? employee : item))
      );
      queryClient.invalidateQueries({ queryKey: ['leadership-employees'] });
    }
  });

  const createRecord = useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: number; payload: LeadershipRecordCreate }) =>
      api.createLeadershipRecord(employeeId, payload),
    onSuccess: (record) => {
      setRecordForm({
        record_type: 'feedback',
        description: '',
        applied_at: new Date().toISOString().slice(0, 10)
      });
      setRecordSuccess(`${recordLabels[record.record_type]} registrado e salvo para ${record.employee_name}.`);
      queryClient.setQueryData<LeadershipRecord[]>(['leadership-records'], (current = []) => [
        record,
        ...current.filter((item) => item.id !== record.id)
      ]);
      queryClient.setQueryData<LeadershipEmployee[]>(['leadership-employees'], (current = []) =>
        current.map((employee) =>
          employee.id === record.employee_id
            ? { ...employee, record_count: employee.record_count + 1 }
            : employee
        )
      );
      queryClient.invalidateQueries({ queryKey: ['leadership-records'] });
      queryClient.invalidateQueries({ queryKey: ['leadership-employees'] });
    }
  });

  if (session.isError) {
    clearLeadershipToken();
    return <Navigate to="/lideranca/login" replace />;
  }

  function logout() {
    void api.leadershipLogout();
    clearLeadershipToken();
    navigate('/lideranca/login', { replace: true });
  }

  function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createEmployee.mutate(employeeForm);
  }

  function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const employeeId = Number(selectedEmployeeId);
    if (!employeeId) return;
    createRecord.mutate({ employeeId, payload: recordForm });
  }

  return (
    <main className="min-h-screen bg-lia-beige text-lia-ink">
      <header className="sticky top-0 z-40 border-b border-lia-red/10 bg-lia-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/logos/logo_burger.png" alt="Grupo Lia" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lia-red">Grupo Lia</p>
              <h1 className="text-lg font-black text-lia-burgundy">Liderança</h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="focus-ring flex items-center gap-2 rounded-lg border border-lia-red/20 px-3 py-2 text-sm font-bold text-lia-burgundy"
          >
            <LogOut size={17} /> Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <PageHeader
          eyebrow="Área reservada"
          title="Gestão de feedbacks e medidas disciplinares"
          description="Cadastre funcionários e registre feedbacks, advertências, suspensões e demissões em uma base interna da liderança."
        />

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard title="Funcionários ativos" value={activeEmployees.length} icon={UsersRound} />
          <SummaryCard title="Registros totais" value={records.data?.length ?? 0} icon={FileText} />
          <SummaryCard
            title="Medidas disciplinares"
            value={(records.data ?? []).filter((record) => record.record_type !== 'feedback').length}
            icon={AlertTriangle}
          />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface rounded-lg p-4">
            <h2 className="text-lg font-black text-lia-burgundy">Cadastrar funcionário</h2>
            <form onSubmit={submitEmployee} className="mt-3 grid gap-3">
              <input
                className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                placeholder="Nome do funcionário"
                value={employeeForm.name}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <select
                className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                value={employeeForm.store}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, store: event.target.value }))}
              >
                {OPERATIONAL_STORES.map((storeName) => (
                  <option key={storeName}>{storeName}</option>
                ))}
              </select>
              <input
                className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                placeholder="Cargo ou função"
                value={employeeForm.position ?? ''}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, position: event.target.value }))}
              />
              {createEmployee.error ? (
                <p className="rounded-lg bg-lia-red/10 px-3 py-2 text-sm font-semibold text-lia-red">
                  {createEmployee.error.message}
                </p>
              ) : null}
              <button
                disabled={createEmployee.isPending}
                className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-70"
              >
                <UserRoundPlus size={18} />
                {createEmployee.isPending ? 'Cadastrando...' : 'Cadastrar funcionário'}
              </button>
            </form>
          </div>

          <div className="surface rounded-lg p-4">
            <h2 className="text-lg font-black text-lia-burgundy">Registrar feedback ou medida</h2>
            <form onSubmit={submitRecord} className="mt-3 grid gap-3">
              <select
                className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                required
              >
                <option value="">Selecione o funcionário</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.store}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                  value={recordForm.record_type}
                  onChange={(event) =>
                    setRecordForm((current) => ({
                      ...current,
                      record_type: event.target.value as LeadershipRecordType
                    }))
                  }
                >
                  <option value="feedback">Feedback</option>
                  <option value="advertencia">Advertência</option>
                  <option value="suspensao">Suspensão</option>
                  <option value="demissao">Demissão</option>
                </select>
                <input
                  className="focus-ring rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                  type="date"
                  value={recordForm.applied_at ?? ''}
                  onChange={(event) => setRecordForm((current) => ({ ...current, applied_at: event.target.value }))}
                />
              </div>
              <textarea
                className="focus-ring min-h-32 rounded-lg border border-lia-red/15 bg-white px-3 py-3 text-sm"
                placeholder="Descreva o feedback aplicado ou a medida disciplinar."
                value={recordForm.description}
                onChange={(event) => setRecordForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
              {createRecord.error ? (
                <p className="rounded-lg bg-lia-red/10 px-3 py-2 text-sm font-semibold text-lia-red">
                  {createRecord.error.message}
                </p>
              ) : null}
              {recordSuccess ? (
                <p className="rounded-lg bg-lia-green/10 px-3 py-2 text-sm font-semibold text-lia-green">
                  {recordSuccess}
                </p>
              ) : null}
              <button
                disabled={createRecord.isPending || !selectedEmployeeId}
                className="focus-ring rounded-lg bg-lia-red px-4 py-3 font-bold text-white disabled:opacity-70"
              >
                {createRecord.isPending ? 'Registrando...' : 'Registrar'}
              </button>
            </form>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <EmployeesPanel
            employees={employees.data ?? []}
            loading={employees.isLoading}
            updatingEmployeeId={updateEmployee.isPending ? updateEmployee.variables?.employeeId : null}
            onToggle={(employee) =>
              updateEmployee.mutate({ employeeId: employee.id, payload: { active: !employee.active } })
            }
            onUpdatePosition={(employee, position) =>
              updateEmployee.mutateAsync({
                employeeId: employee.id,
                payload: { position: position.trim() || null }
              })
            }
          />
          <RecordsPanel records={records.data ?? []} loading={records.isLoading} />
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof UsersRound }) {
  return (
    <article className="surface rounded-lg p-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-lia-red/10 text-lia-red">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-lia-muted">{title}</p>
      <strong className="mt-1 block text-2xl font-black text-lia-burgundy">{value}</strong>
    </article>
  );
}

function EmployeesPanel({
  employees,
  loading,
  updatingEmployeeId,
  onToggle,
  onUpdatePosition
}: {
  employees: LeadershipEmployee[];
  loading: boolean;
  updatingEmployeeId: number | null | undefined;
  onToggle: (employee: LeadershipEmployee) => void;
  onUpdatePosition: (employee: LeadershipEmployee, position: string) => Promise<LeadershipEmployee>;
}) {
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [positionDraft, setPositionDraft] = useState('');
  const [positionError, setPositionError] = useState('');

  function startPositionEdit(employee: LeadershipEmployee) {
    setEditingEmployeeId(employee.id);
    setPositionDraft(employee.position ?? '');
    setPositionError('');
  }

  async function savePosition(event: FormEvent<HTMLFormElement>, employee: LeadershipEmployee) {
    event.preventDefault();
    setPositionError('');
    try {
      await onUpdatePosition(employee, positionDraft);
      setEditingEmployeeId(null);
      setPositionDraft('');
    } catch (error) {
      setPositionError(error instanceof Error ? error.message : 'Não foi possível atualizar a função.');
    }
  }

  return (
    <div className="surface rounded-lg p-4">
      <h2 className="text-lg font-black text-lia-burgundy">Funcionários cadastrados</h2>
      {loading ? <p className="mt-3 text-sm text-lia-muted">Carregando funcionários...</p> : null}
      <div className="mt-3 space-y-2">
        {employees.map((employee) => (
          <article key={employee.id} className="rounded-lg bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-lia-burgundy">{employee.name}</p>
                <p className="text-xs text-lia-muted">
                  {employee.store}
                  {employee.position ? ` - ${employee.position}` : ' - função não informada'}
                </p>
              </div>
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold ${
                  employee.active ? 'bg-lia-green/10 text-lia-green' : 'bg-lia-muted/10 text-lia-muted'
                }`}
              >
                {employee.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            {editingEmployeeId === employee.id ? (
              <form onSubmit={(event) => savePosition(event, employee)} className="mt-3 grid gap-2">
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-lia-muted">
                  Cargo ou função
                  <input
                    className="focus-ring mt-1 w-full rounded-lg border border-lia-red/15 bg-lia-cream px-3 py-2 text-sm normal-case tracking-normal text-lia-ink"
                    value={positionDraft}
                    onChange={(event) => setPositionDraft(event.target.value)}
                    placeholder="Ex.: Atendente, chapeiro, caixa"
                  />
                </label>
                {positionError ? (
                  <p className="rounded-lg bg-lia-red/10 px-3 py-2 text-xs font-semibold text-lia-red">
                    {positionError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={updatingEmployeeId === employee.id}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg bg-lia-red px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                  >
                    <Check size={14} />
                    {updatingEmployeeId === employee.id ? 'Salvando...' : 'Salvar função'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setPositionDraft('');
                      setPositionError('');
                    }}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy"
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-lia-muted">{employee.record_count} registro(s)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startPositionEdit(employee)}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy"
                >
                  <Pencil size={14} />
                  Editar função
                </button>
                <button
                  onClick={() => onToggle(employee)}
                  disabled={updatingEmployeeId === employee.id}
                  className="focus-ring rounded-lg border border-lia-red/20 px-3 py-2 text-xs font-bold text-lia-burgundy disabled:opacity-70"
                >
                  {employee.active ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </div>
          </article>
        ))}
        {!employees.length && !loading ? (
          <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhum funcionário cadastrado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}

function RecordsPanel({ records, loading }: { records: LeadershipRecord[]; loading: boolean }) {
  return (
    <div className="surface rounded-lg p-4">
      <h2 className="text-lg font-black text-lia-burgundy">Histórico recente</h2>
      {loading ? <p className="mt-3 text-sm text-lia-muted">Carregando registros...</p> : null}
      <div className="mt-3 space-y-3">
        {records.slice(0, 12).map((record) => (
          <article key={record.id} className="rounded-lg bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-lia-burgundy">{record.employee_name}</p>
                <p className="text-xs text-lia-muted">
                  {record.employee_store} - {new Date(record.applied_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${recordStyles[record.record_type]}`}>
                {recordLabels[record.record_type]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-lia-ink">{record.description}</p>
            <p className="mt-2 text-xs text-lia-muted">Registrado por {record.created_by}</p>
          </article>
        ))}
        {!records.length && !loading ? (
          <p className="rounded-lg bg-white p-3 text-sm text-lia-muted">Nenhum registro aplicado ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
