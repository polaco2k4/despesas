import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { configuracoesAPI } from '../lib/backendApi';
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Receipt,
  CheckCircle2,
  CalendarDays,
  Bell,
  ArrowRight,
  ShieldCheck,
  PiggyBank,
  Car,
} from 'lucide-react';

const SYSTEM_NAME = 'SISTEMA INTEGRADO DE GESTÃO EMPRESARIAL';

const features = [
  { icon: PiggyBank, title: 'Orçamentos', text: 'Definição e controlo de orçamentos por área' },
  { icon: Car, title: 'Gestão de Frotas', text: 'Controlo de viaturas, quilometragem e manutenção' },
  { icon: Receipt, title: 'Despesas', text: 'Registo e acompanhamento de despesas' },
  { icon: CheckCircle2, title: 'Aprovações', text: 'Fluxos de aprovação simples e rastreáveis' },
  { icon: CalendarDays, title: 'Planeamento', text: 'Planeamento integrado com o fluxo de despesas' },
  { icon: Bell, title: 'Notificações', text: 'Alertas em tempo útil para cada etapa' },
];

// Single-line heading whose font size grows to fill the available width
const FitText: React.FC<{ text: string; min?: number; max?: number; className?: string }> = ({
  text,
  min = 14,
  max = 56,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    const fit = () => {
      el.style.fontSize = `${max}px`;
      const available = container.clientWidth;
      const needed = el.scrollWidth;
      const size = needed > available ? (max * available) / needed : max;
      el.style.fontSize = `${Math.max(min, Math.floor(size))}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => observer.disconnect();
  }, [text, min, max]);

  return (
    <div ref={containerRef} className="w-full">
      <h1 ref={textRef} className={`whitespace-nowrap inline-block ${className}`}>
        {text}
      </h1>
    </div>
  );
};

const Login: React.FC = () => {
  const { signIn, userProfile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logo, setLogo] = useState<string | null>(() => configuracoesAPI.getCachedImagem('logo'));
  const [fundo, setFundo] = useState<string | null>(() => configuracoesAPI.getCachedImagem('fundo'));
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Load the images configured by the admin (keeps the defaults on failure)
  useEffect(() => {
    let active = true;
    configuracoesAPI
      .getPublicas()
      .then(({ logo, fundo }) => {
        if (!active) return;
        setLogo(logo);
        setFundo(fundo);
        configuracoesAPI.setCachedImagem('logo', logo);
        configuracoesAPI.setCachedImagem('fundo', fundo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (userProfile && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [userProfile, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const identifier = email.trim();
    if (!identifier || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signIn(identifier, password);

      if (error) {
        setError(typeof error === 'string' ? error : error.message || 'Email/utilizador ou senha inválidos');
      }
      // Navigation is handled by the useEffect above
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'));
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  const inputClass =
    'block w-full h-12 pl-11 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder-slate-400 transition focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 text-white p-12 xl:p-16">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative">
          {logo ? (
            <div className="inline-flex bg-white rounded-2xl p-3 shadow-xl shadow-black/20">
              <img
                src={logo}
                alt="Logotipo"
                className="h-14 max-w-[220px] object-contain"
                onError={() => setLogo(null)}
              />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="relative">
          <p className="text-6xl xl:text-7xl font-black tracking-wider leading-none mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent">
            SIGE
          </p>
          <FitText text={SYSTEM_NAME} className="font-extrabold leading-tight tracking-tight text-white" />
          <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
          <p className="mt-5 text-lg text-blue-100/80">
            Gestão de despesas, aprovações e planeamento num único lugar.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 max-w-xl">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm p-4 transition hover:bg-white/10"
              >
                <div className="mb-3 h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-snug text-blue-100/70">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-blue-200/60">© {new Date().getFullYear()} {SYSTEM_NAME}</p>
      </aside>

      {/* Form panel */}
      <main className="relative overflow-hidden flex items-center justify-center px-4 py-12 sm:px-8">
        {fundo ? (
          <div className="absolute inset-0" aria-hidden="true">
            {/* Blurred copy fills the gaps left by the full image */}
            <img
              src={fundo}
              alt=""
              className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl"
            />
            {/* Full image, always visible without cropping */}
            <img
              src={fundo}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              onError={() => setFundo(null)}
            />
            <div className="absolute inset-0 bg-slate-900/30" />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
          </div>
        )}

        <div className="relative w-full max-w-md">
          <div className="rounded-3xl bg-white/85 backdrop-blur-xl ring-1 ring-slate-900/5 shadow-2xl shadow-slate-900/10 p-8 sm:p-10">
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              {logo ? (
                <img
                  src={logo}
                  alt="Logotipo"
                  className="mx-auto h-14 max-w-[200px] object-contain mb-4"
                  onError={() => setLogo(null)}
                />
              ) : (
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
              )}
              <p className="text-3xl font-black tracking-wider bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                SIGE
              </p>
              <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">{SYSTEM_NAME}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo</h2>
              <p className="mt-2 text-slate-500">Entre na sua conta para continuar</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email ou utilizador
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 transition group-focus-within:text-blue-600" />
                  </div>
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className={`${inputClass} pr-4`}
                    placeholder="nome@empresa.com ou utilizador"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Pode usar as credenciais da rede (AD).</p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 transition group-focus-within:text-blue-600" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyUp={handleCapsLock}
                    onKeyDown={handleCapsLock}
                    onBlur={() => setCapsLock(false)}
                    className={`${inputClass} pr-12`}
                    placeholder="A sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-blue-600"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {capsLock && (
                  <p className="mt-1.5 text-xs font-medium text-amber-600">Caps Lock está ativo.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group w-full h-12 flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:shadow-xl hover:shadow-blue-600/40 hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    A entrar...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Ligação segura</span>
            </div>
          </div>

          <p className={`lg:hidden mt-6 text-center text-xs ${fundo ? 'text-white/80' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} {SYSTEM_NAME}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
