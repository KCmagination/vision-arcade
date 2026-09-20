"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Crosshair,
  Expand,
  Gamepad2,
  Orbit,
  Radio,
  RotateCcw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  MessageCircle,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FieldHelp } from "@/components/field-help";
import type { AvatarKind, CornerStrengths } from "@/components/avatar-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_CURRENT,
  DEFAULT_SCENARIO,
  type CurrentInputs,
  type ScenarioInputs,
  type CornerSignal,
} from "@/lib/vision-contract.js";
import { useCalculator } from "@/hooks/use-calculator";
import { useWebGLSupport } from "@/hooks/use-webgl-support";
import { PracticePictures } from "@/components/practice-pictures";
import { BetaFeedback } from "@/components/beta-feedback";
import { VisionWelcome, markWelcomeSeen, focusWelcomeSection } from "@/components/vision-welcome";

const AvatarStage = dynamic(
  () => import("@/components/avatar-stage").then((m) => m.AvatarStage),
  {
    ssr: false,
    loading: () => <div className="avatar-fallback">Loading live avatar…</div>,
  },
);
const TrainingArena = dynamic(
  () => import("@/components/training-arena").then((m) => m.TrainingArena),
  { ssr: false, loading: () => <p>Preparing the range…</p> },
);
const DebtbreakArena = dynamic(
  () => import("@/components/debtbreak-arena").then((m) => m.DebtbreakArena),
  {
    ssr: false,
    loading: () => <div className="avatar-fallback">Opening the sector…</div>,
  },
);
const DebtInvadersArena = dynamic(
  () => import("@/components/debt-invaders-arena").then((m) => m.DebtInvadersArena),
  { ssr: false, loading: () => <div className="avatar-fallback">Preparing your defense…</div> },
);
const DebtInvadersPreview = dynamic(
  () => import("@/components/debt-invaders-arena").then((m) => m.DebtInvadersPreview),
  { ssr: false },
);
const WantsNeedsArena = dynamic(
  () => import("@/components/wants-needs-arena").then((m) => m.WantsNeedsArena),
  { ssr: false, loading: () => <div className="avatar-fallback">Opening the streets…</div> },
);
const WantsNeedsPreview = dynamic(
  () => import("@/components/wants-needs-arena").then((m) => m.WantsNeedsPreview),
  { ssr: false },
);
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
type CornerKey = keyof CornerStrengths;
const CORNERS = [
  {
    key: "credit",
    title: "Credit",
    part: "Antenna",
    treePart: "Height",
    color: "#b2a0ff",
    icon: Radio,
  },
  {
    key: "collateral",
    title: "Collateral",
    part: "Armor",
    treePart: "Roots",
    color: "#ffc16e",
    icon: ShieldCheck,
  },
  {
    key: "cashFlow",
    title: "Cash flow",
    part: "Weapon",
    treePart: "Leaves",
    color: "#64e1f5",
    icon: Zap,
  },
  {
    key: "capital",
    title: "Capital",
    part: "Shield",
    treePart: "Trunk",
    color: "#69e3b2",
    icon: Shield,
  },
] as const;
const CHARACTERS = {
  mech: {
    name: "Sentinel",
    class: "Mech",
    subtitle: "Steel resolve. Your four corners, equipped.",
    image: "/characters/sentinel.png",
  },
  tree: {
    name: "Verdant",
    class: "Tree",
    subtitle: "Deep roots. Room to grow in every direction.",
    image: "/characters/verdant.png",
  },
};
export const CREDIT_GRADES = [
  [760, "A+"],
  [740, "A"],
  [720, "A−"],
  [700, "B+"],
  [680, "B"],
  [660, "B−"],
  [640, "C+"],
  [620, "C"],
  [600, "C−"],
  [580, "D+"],
  [560, "D"],
  [540, "D−"],
  [450, "F"],
] as const;
export function creditGrade(score: number | null) {
  return score === null
    ? null
    : (CREDIT_GRADES.find(([floor]) => score >= floor)?.[1] ?? "F");
}
function rawLabel(key: CornerKey, signal: CornerSignal) {
  if (signal.status === "unknown") return "Not entered";
  if (key === "cashFlow")
    return `${money.format(Number(signal.raw.net))} / mo remaining`;
  if (key === "capital")
    return signal.raw.runway === "unbounded"
      ? "No monthly outflow"
      : `${number.format(Number(signal.raw.months ?? 0))} months of reserves`;
  if (key === "collateral")
    return `${money.format(Number(signal.raw.equity))} equity`;
  const score = Number(signal.raw.score);
  return `${score} credit score · ${creditGrade(score)}`;
}
const percent = (value: number | null) =>
  value === null ? "—" : Math.round(value * 100);
function InputField({
  id,
  label,
  value,
  onChange,
  hint,
  signed,
  credit,
  min,
  help,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  signed?: boolean;
  credit?: boolean;
  min?: number;
  help?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);
  const rangeMax = credit
    ? 850
    : Math.max(
        Math.abs(value ?? 0),
        /Income|Payment|Expenses|Cost/.test(id)
          ? 10000
          : /Debt|Value/.test(id)
            ? 250000
            : 120000,
      );
  const rangeMin = credit ? 450 : (min ?? (signed ? -rangeMax : 0));
  const bound = (n: number) =>
    Math.max(min ?? (signed ? -Infinity : 0), credit ? Math.min(850, n) : n);
  return (
    <div className="input-control">
      <div className="input-row">
        <div className="input-label">
          <label htmlFor={id}>
            {label}
            {hint && <span className="field-hint">{hint}</span>}
          </label>
          {help && <FieldHelp label={label} text={help} />}
        </div>
        <div className="input-value">
          {!credit && <span>$</span>}
          {signed && (
            <button
              type="button"
              className="input-sign"
              aria-label={`Change sign of ${label.toLowerCase()}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (["", "-", ".", "-."].includes(draft) || Number(draft) === 0)
                  setDraft(draft.startsWith("-") ? "0" : "-");
                else {
                  const next = bound(-Number(draft));
                  setDraft(String(next));
                  onChange(next);
                }
                input.current?.focus({ preventScroll: true });
              }}
            >
              ±
            </button>
          )}
          <Input
            ref={input}
            id={id}
            aria-label={label}
            aria-describedby={help ? `${id}-explanation` : undefined}
            type="text"
            inputMode={credit ? "numeric" : "decimal"}
            value={draft}
            placeholder={credit ? "Optional" : "0"}
            onBlur={() => {
              if (
                draft === "" ||
                draft === "-" ||
                draft === "." ||
                draft === "-."
              ) {
                setDraft(credit ? "" : "0");
                onChange(credit ? null : 0);
              }
            }}
            onChange={(e) => {
              const raw = e.target.value;
              if (
                !(
                  signed
                    ? /^-?\d*(\.\d*)?$/
                    : credit
                      ? /^\d*$/
                      : /^\d*(\.\d*)?$/
                ).test(raw)
              )
                return;
              setDraft(raw);
              if (raw === "") {
                if (credit) onChange(null);
                return;
              }
              if (raw === "-" || raw === "." || raw === "-.") return;
              const next = Number(raw);
              if (Number.isFinite(next)) {
                const bounded = bound(next);
                if (bounded !== next) setDraft(String(bounded));
                onChange(bounded);
              }
            }}
          />
        </div>
      </div>
      {help && (
        <span id={`${id}-explanation`} className="sr-only">
          {help}
        </span>
      )}
      <Slider
        className="finance-slider"
        min={rangeMin}
        max={rangeMax}
        step={credit ? 1 : 50}
        value={[Math.max(rangeMin, value ?? (credit ? 650 : 0))]}
        onValueChange={([v]) => {
          const next = bound(v);
          setDraft(String(next));
          onChange(next);
        }}
        aria-label={`Adjust ${label.toLowerCase()}`}
      />
    </div>
  );
}

export function VisionWorkspace() {
  const webGL = useWebGLSupport();
  const [current, setCurrent] = useState<CurrentInputs>({ ...DEFAULT_CURRENT });
  const [scenario, setScenario] = useState<ScenarioInputs>({
    ...DEFAULT_SCENARIO,
  });
  const [avatar, setAvatar] = useState<AvatarKind>("mech");
  const [snapshot, setSnapshot] = useState<"current" | "scenario">("current");
  const [view, setView] = useState<"art" | "live">("live");
  const [spin, setSpin] = useState(true);
  const [cameraView, setCameraView] = useState<"full" | "detail">("full");
  const [action, setAction] = useState<"idle" | "fire" | "shield">("idle");
  const [tint, setTint] = useState("#6ee6d0");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [invadersOpen, setInvadersOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [selectedCorner, setSelectedCorner] = useState<CornerKey>("cashFlow");
  const [arenaOpen, setArenaOpen] = useState(false);
  const [concept, setConcept] = useState<"canopy" | null>(null);
  const [plannedFeature, setPlannedFeature] = useState<"budget" | "guide" | null>(null);
  const inputPanelRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const [edited, setEdited] = useState(false);
  const [exampleName, setExampleName] = useState("Starting example");
  const [announcement, setAnnouncement] = useState("");
  const [thresholdFlash, setThresholdFlash] = useState<CornerKey | null>(null);
  const previousThresholds = useRef<{
    grade: string | null;
    dtiBand: number | null;
  } | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vision-avatar");
      if (saved === "mech" || saved === "tree") setAvatar(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (window.location.hash !== "#picture") return;
    const timer = window.setTimeout(() => focusWelcomeSection("monthlyIncome"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const moveTo = (target: "inputs" | "how") => {
    markWelcomeSeen();
    if (target === "inputs") setSnapshot("current");
    requestAnimationFrame(() => focusWelcomeSection(target === "inputs" ? "monthlyIncome" : "how-it-works"));
  };
  const chooseAvatar = (next: AvatarKind) => {
    setAvatar(next);
    try {
      localStorage.setItem("vision-avatar", next);
    } catch {}
  };
  const { comparison, pending, error, ready, hasResult, retry } = useCalculator(
    current,
    scenario,
  );
  const active = comparison[snapshot];
  const strengths = useMemo(
    () =>
      Object.fromEntries(
        CORNERS.map((c) => [c.key, active.corners[c.key].strength]),
      ) as CornerStrengths,
    [active],
  );
  const score =
    active.corners.credit.status === "unknown"
      ? null
      : Number(active.corners.credit.raw.score);
  const grade = creditGrade(score);
  const dti =
    active.corners.cashFlow.raw.load === null
      ? null
      : Number(active.corners.cashFlow.raw.load);
  const reserveMonths =
    active.corners.capital.raw.runway === "unbounded"
      ? 999
      : active.corners.capital.raw.months === null
        ? null
        : Number(active.corners.capital.raw.months);
  const visualState = useMemo(
    () => ({ creditGrade: grade, creditScore: score, dti, reserveMonths }),
    [grade, score, dti, reserveMonths],
  );
  const character = CHARACTERS[avatar];
  const selected = CORNERS.find((c) => c.key === selectedCorner)!;
  useEffect(() => {
    if (action === "idle") return;
    const t = setTimeout(() => setAction("idle"), 1800);
    return () => clearTimeout(t);
  }, [action]);
  useEffect(() => {
    const next = { grade, dtiBand: dti === null ? null : Math.floor(dti * 10) };
    const previous = previousThresholds.current;
    previousThresholds.current = next;
    const crossed =
      previous && previous.grade !== next.grade
        ? "credit"
        : previous &&
            previous.dtiBand !== null &&
            next.dtiBand !== null &&
            previous.dtiBand !== next.dtiBand
          ? "cashFlow"
          : null;
    if (!crossed) return;
    setThresholdFlash(crossed);
    const timer = setTimeout(() => setThresholdFlash(null), 850);
    return () => clearTimeout(timer);
  }, [grade, dti]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(
      () =>
        setAnnouncement(
          `${character.name}, ${snapshot} picture. ${CORNERS.map((c) => `${c.title}: ${rawLabel(c.key, active.corners[c.key])}, attribute ${percent(active.corners[c.key].strength)} out of 100`).join(". ")}`,
        ),
      600,
    );
    return () => clearTimeout(timer);
  }, [active, character.name, snapshot, ready]);
  const updateCurrent = (key: keyof CurrentInputs, value: number | null) => {
    setEdited(true);
    setCurrent((p) => ({
      ...p,
      [key]: value ?? (key === "creditScore" ? null : 0),
    }));
  };
  const updateScenario = (key: keyof ScenarioInputs, value: number | null) =>
    setScenario((p) => ({ ...p, [key]: value ?? 0 }));
  const reset = () => {
    setCurrent({ ...DEFAULT_CURRENT });
    setScenario({ ...DEFAULT_SCENARIO });
    setEdited(false);
    setExampleName("Starting example");
    setSnapshot("current");
  };
  const choosePicture = (inputs: CurrentInputs, name: string) => {
    setCurrent(inputs); setScenario({ ...DEFAULT_SCENARIO }); setSnapshot("current");
    setExampleName(name); setEdited(false);
  };
  const displayArt = view === "art" || webGL !== true;

  return (
    <main className={`vision-shell theme-${avatar}`}>
      <a href="#hangar" className="skip-link">
        Skip to avatar setup
      </a>
      <header className="topbar">
        <a href="/welcome" className="brand" aria-label="About Vi$ion">
          VI<span>$</span>ION
          <span className="brand-cross" aria-hidden="true">
            ✦
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#hangar" className="nav-current">
            Avatar hangar
          </a>
          <a href="#arcade">The arcade</a>
          <a href="#engine">The engine</a>
        </nav>
        <span className="prototype-label">
          AVATAR LAB <span>03</span>
        </span>
      </header>
      <section className="intro" id="hangar">
        <div className="intro-copy">
          <p className="eyebrow">
            <span className="tiny-line" /> VI$ION / AVATAR LAB
          </p>
          <h1>See your finances. Change the picture. <span>Play the consequences.</span></h1>
          <p>Vi$ion turns Cash Flow, Capital, Collateral, and Credit into a visual avatar and financial games so you can understand how the pieces of your financial life interact.</p>
          <div className="intro-actions">
            <Button className="primary-action" onClick={() => moveTo("inputs")}>Build My Vi$ion <ArrowRight size={17} /></Button>
            <Button variant="outline" onClick={() => moveTo("how")}>How It Works <ArrowDown size={17} /></Button>
          </div>
        </div>
        <div className="first-play"><Button className="primary-action" disabled={!ready} onClick={() => setSectorOpen(true)}><Gamepad2 size={19} /> Start Debtbreak <ArrowRight size={17} /></Button><p>Your selected picture powers Debtbreaker. Practice without moving real money.</p><a href="#arcade">Explore all games <ArrowDown size={14} /></a></div>
      </section>
      <div
        className={`calculator-status ${error ? "has-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {error ? (
          <>
            <span>
              {error}
              {hasResult
                ? " Showing the last calculated picture."
                : " Your entries are still here."}
            </span>
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </>
        ) : pending ? (
          <span>
            {hasResult
              ? "Updating your four corners… Showing the last calculated picture."
              : "Connecting your four corners…"}
          </span>
        ) : (
          <span>
            <Check size={14} aria-hidden="true" /> Your loadout is up to date.
          </span>
        )}
      </div>
      <div className="hangar-grid" aria-busy={pending}>
        <aside className="setup-panel" id="picture" ref={inputPanelRef} tabIndex={-1}>
          <div className="section-heading">
            <span className="step-number">01</span>
            <h2>Choose your form</h2>
          </div>
          <div className="character-picker" aria-label="Choose your avatar">
            {(["mech", "tree"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={avatar === kind}
                onClick={() => chooseAvatar(kind)}
                className={avatar === kind ? "chosen" : ""}
              >
                <img
                  src={CHARACTERS[kind].image}
                  alt=""
                  width="1024"
                  height="1536"
                />
                <span>{CHARACTERS[kind].class}</span>
                {avatar === kind && <Check size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="section-heading input-heading">
            <span className="step-number">02</span>
            <h2>Power your avatar</h2>
            <Button
              onClick={reset}
              variant="ghost"
              size="icon-sm"
              aria-label="Reset example values"
              title="Reset example values"
            >
              <RotateCcw size={15} />
            </Button>
          </div>
          <PracticePictures onChoose={choosePicture} />
          <Tabs
            value={snapshot}
            onValueChange={(v) => setSnapshot(v as "current" | "scenario")}
            className="input-tabs"
          >
            <TabsList className="mode-tabs">
              <TabsTrigger value="current">My picture</TabsTrigger>
              <TabsTrigger value="scenario">What if?</TabsTrigger>
            </TabsList>
            <TabsContent value="current" className="input-fields">
              <p className="data-label">
                {edited
                  ? "Your entries · this session"
                  : `${exampleName} · fictional data`}
              </p>
              <InputField
                id="monthlyIncome"
                label="Take-home income"
                help="Income after payroll taxes, insurance, benefits and other paycheck deductions. Do not subtract those deductions again as living expenses."
                hint="per month"
                value={current.monthlyIncome}
                onChange={(v) => updateCurrent("monthlyIncome", v)}
              />
              <InputField
                id="monthlyDebtPayments"
                label="Debt payments"
                help="Required credit-debt payments, including a mortgage or car loan. Count a mortgage here once; include rent in living expenses instead. Exclude voluntary extra repayments."
                hint="per month"
                value={current.monthlyDebtPayments}
                onChange={(v) => updateCurrent("monthlyDebtPayments", v)}
              />
              <InputField
                id="monthlyLivingExpenses"
                label="Living expenses"
                help="Other spending such as rent, food and utilities. Exclude debt payments already entered above and costs already deducted from take-home pay. If mortgage escrow is included in your payment, do not count those taxes or insurance again."
                hint="per month"
                value={current.monthlyLivingExpenses}
                onChange={(v) => updateCurrent("monthlyLivingExpenses", v)}
              />
              <InputField
                id="liquidReserves"
                label="Liquid reserves"
                help="Accessible emergency savings. Do not include home equity, belongings or money unavailable for an emergency."
                signed
                min={-1000}
                value={current.liquidReserves}
                onChange={(v) => updateCurrent("liquidReserves", v)}
              />
              <InputField
                id="totalDebt"
                label="Total debt"
                help="add the total amount of debt"
                value={current.totalDebt}
                onChange={(v) => updateCurrent("totalDebt", v)}
              />
              <InputField
                id="assetValue"
                label="Asset resale value"
                help="the value of your material items"
                value={current.assetValue}
                onChange={(v) => updateCurrent("assetValue", v)}
              />
              <InputField
                id="creditScore"
                label="Credit score"
                value={current.creditScore}
                credit
                onChange={(v) => updateCurrent("creditScore", v)}
              />
            </TabsContent>
            <TabsContent value="scenario" className="input-fields">
              <p className="data-label">A possible change to your picture</p>
              <InputField
                id="upfrontCash"
                label="Cash used upfront"
                value={scenario.upfrontCash}
                onChange={(v) => updateScenario("upfrontCash", v)}
              />
              <InputField
                id="newMonthlyPayment"
                label="Added monthly cost"
                value={scenario.newMonthlyPayment}
                onChange={(v) => updateScenario("newMonthlyPayment", v)}
              />
              <InputField
                id="newDebt"
                label="Added debt"
                value={scenario.newDebt}
                onChange={(v) => updateScenario("newDebt", v)}
              />
              <InputField
                id="acquiredAssetValue"
                label="Added asset value"
                value={scenario.acquiredAssetValue}
                onChange={(v) => updateScenario("acquiredAssetValue", v)}
              />
              <InputField
                id="monthlyIncomeChange"
                label="Income change"
                hint="per month · + or −"
                value={scenario.monthlyIncomeChange}
                signed
                onChange={(v) => updateScenario("monthlyIncomeChange", v)}
              />
              <p className="scenario-help">
                See the tradeoff before you make a move. Credit stays unchanged;
                Vi$ion doesn’t predict a future score.
              </p>
            </TabsContent>
          </Tabs>
          <p className="input-footnote">
            Entries are sent to Vi$ion’s calculator to update your avatar. This
            app does not save them. Entries reset on refresh. No bank
            connection.
          </p>
        </aside>
        <section
          className="character-stage"
          id="avatar"
          aria-label={`${character.name} avatar preview`}
        >
          <div className="stage-toolbar">
            <span>
              <span className="status-pip" />
              {!ready
                ? "AWAITING CALCULATION"
                : snapshot === "current"
                  ? "CURRENT LOADOUT"
                  : "WHAT-IF LOADOUT"}
            </span>
            <div className="view-switch" aria-label="Avatar display">
              <button
                aria-pressed={!displayArt}
                disabled={webGL !== true}
                onClick={() => setView("live")}
              >
                Live avatar
              </button>
              <button
                aria-pressed={displayArt}
                onClick={() => setView("art")}
              >
                Concept
              </button>
            </div>
            <div className="stage-tools" aria-label="Planned tools">
              <button aria-label="Connect your budget — planned" onClick={() => setPlannedFeature("budget")}><WalletCards size={15}/>Budget</button>
              <button aria-label="Vi$ion guide — planned" onClick={() => setPlannedFeature("guide")}><MessageCircle size={15}/>Guide</button>
            </div>
          </div>
          <div className="avatar-display">
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <span className="stage-coordinate coord-left" aria-hidden="true">
              V / 001
              <br />
              FOUR CORNERS
            </span>
            <span className="stage-coordinate coord-right" aria-hidden="true">
              {avatar === "mech" ? "M-01" : "T-02"}
              <br />
              {character.class.toUpperCase()}
            </span>
            {displayArt ? (
              <div className="character-art">
                <img
                  key={avatar}
                  className="main-character"
                  src={character.image}
                  alt={`${character.name}: ${avatar === "mech" ? "an armored mech with credit wings, equity armor, energy sword and shield" : "a healthy tree guardian with a high canopy, lush leaves, thick trunk and branching roots"}`}
                  width="1024"
                  height="1536"
                  fetchPriority="high"
                />
                <div className="art-caption">{webGL === false ? "STILL VIEW · 3D UNAVAILABLE IN THIS BROWSER" : "CHARACTER CONCEPT"}</div>
              </div>
            ) : (
              <div className="live-model">
                <AvatarStage
                  avatar={avatar}
                  strengths={strengths}
                  visualState={visualState}
                  selected={selectedCorner}
                  action={action}
                  spin={spin}
                  cameraView={cameraView}
                  tint={tint}
                  paused={sectorOpen || arenaOpen || invadersOpen || runnerOpen || concept !== null}
                />
              </div>
            )}
            <div className="stage-platform" aria-hidden="true" />
            <div
              className={`live-attribute ${thresholdFlash === selectedCorner ? "threshold-flash" : ""}`}
              style={{ "--corner": selected.color } as CSSProperties}
            >
              <selected.icon size={17} />
              <span>
                {avatar === "mech" ? selected.part : selected.treePart}
              </span>
              <strong>
                {selected.key === "credit" && grade
                  ? grade
                  : percent(strengths[selected.key])}
                <small>
                  {selected.key === "credit" && grade ? ` · ${score}` : "/100"}
                </small>
              </strong>
            </div>
          </div>
          <div className="model-controls">
            <button
              disabled={webGL !== true}
              aria-pressed={spin}
              onClick={() => {
                setView("live");
                setSpin((v) => !v);
              }}
              title="Toggle turntable"
            >
              <Orbit size={16} />
              Rotate
            </button>
            <button
              disabled={webGL !== true}
              aria-pressed={cameraView === "detail"}
              onClick={() => {
                setView("live");
                setCameraView((v) => (v === "full" ? "detail" : "full"));
              }}
            >
              <Expand size={16} />
              Inspect
            </button>
            <button
              disabled={webGL !== true}
              onClick={() => {
                setView("live");
                setAction("fire");
              }}
            >
              <Zap size={16} />
              Pulse
            </button>
            <button
              disabled={webGL !== true}
              onClick={() => {
                setView("live");
                setAction("shield");
              }}
            >
              <Shield size={16} />
              Shield
            </button>
          </div>
          <div className="character-title">
            <p>
              {character.class.toUpperCase()} / AVATAR{" "}
              {avatar === "mech" ? "01" : "02"}
            </p>
            <h2>{character.name}</h2>
            <span>{character.subtitle}</span>
          </div>
          <div className="stage-actions">
            <Button
              className="primary-action"
              disabled={!ready}
              onClick={() => setSectorOpen(true)}
            >
              <Gamepad2 size={20} />
              Enter Debtbreak
              <ArrowRight size={18} />
            </Button>
            {webGL === false ? <span className="model-help">The money map and 2D games work here. 3D games need WebGL.</span> : <span className="model-help">
              <span className="keyboard-instructions">
                Drag to orbit · Scroll or pinch to zoom
              </span>
              <span className="touch-instructions">
                Tap Move avatar to rotate or zoom.
              </span>
            </span>}
          </div>
        </section>
        <aside id="forces" className="attributes-panel">
          <div className="section-heading">
            <span className="step-number">03</span>
            <h2>Your four corners</h2>
          </div>
          <p className="attribute-intro">
            Different strengths. One complete avatar.
          </p>
          <div className="attribute-list">
            {CORNERS.map((c) => {
              const signal = active.corners[c.key];
              const delta = comparison.deltas[c.key];
              return (
                <button
                  key={c.key}
                  className={`attribute-card ${selectedCorner === c.key ? "selected" : ""} ${thresholdFlash === c.key ? "threshold-flash" : ""} ${c.key === "capital" && reserveMonths !== null && reserveMonths >= 12 ? "fully-charged" : ""}`}
                  style={{ "--corner": c.color } as CSSProperties}
                  onClick={() => {
                    setSelectedCorner(c.key);
                    setView("live");
                  }}
                  aria-pressed={selectedCorner === c.key}
                >
                  <div className="attribute-top">
                    <span className="attribute-icon">
                      <c.icon size={19} />
                    </span>
                    <div>
                      <span>{c.title}</span>
                      <h3>{avatar === "mech" ? c.part : c.treePart}</h3>
                    </div>
                    <strong>
                      {c.key === "credit" && grade
                        ? grade
                        : percent(signal.strength)}
                      <small>
                        {c.key === "credit" && grade ? " grade" : "/100"}
                      </small>
                    </strong>
                  </div>
                  <div className="attribute-meter" aria-hidden="true">
                    <span
                      style={{ width: `${(signal.strength ?? 0) * 100}%` }}
                    />
                  </div>
                  <div className="attribute-reading">
                    <span>
                      {rawLabel(c.key, signal)}
                      {c.key === "capital" &&
                      reserveMonths !== null &&
                      reserveMonths >= 12
                        ? " · FULLY CHARGED"
                        : ""}
                    </span>
                    {snapshot === "scenario" && (
                      <span className="delta">
                        {delta === null
                          ? "—"
                          : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}`}
                        <small> pts</small>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            className="force-focus"
            style={{ "--corner": selected.color } as CSSProperties}
          >
            <selected.icon size={17} />
            <div>
              <strong>
                {avatar === "mech" ? selected.part : selected.treePart} selected
              </strong>
              <p>Move an input slider to watch this force respond.</p>
            </div>
          </div>
          <div className="lighting-picker">
            <span>Hangar lighting</span>
            <div>
              {["#6ee6d0", "#84aaff", "#f2b56c"].map((color, i) => (
                <button
                  key={color}
                  aria-label={
                    ["Aurora lighting", "Ion lighting", "Solar lighting"][i]
                  }
                  aria-pressed={tint === color}
                  style={{ background: color }}
                  onClick={() => setTint(color)}
                />
              ))}
            </div>
          </div>
          <a className="text-link" href="#engine">
            How the four corners work <ArrowRight size={15} />
          </a>
        </aside>
      </div>
      <section
        className="comparison-section"
        aria-labelledby="comparison-title"
      >
        <div className="comparison-label">
          <p className="eyebrow">THE RIPPLE EFFECT</p>
          <h2 id="comparison-title">What changes?</h2>
          <p>Current picture → your what-if.</p>
        </div>
        <div className="comparison-values">
          {CORNERS.map((c) => (
            <div key={c.key} style={{ "--corner": c.color } as CSSProperties}>
              <p>{c.title}</p>
              <strong>
                {percent(comparison.current.corners[c.key].strength)}{" "}
                <ArrowRight size={17} />{" "}
                {percent(comparison.scenario.corners[c.key].strength)}
              </strong>
              <span>{rawLabel(c.key, comparison.scenario.corners[c.key])}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="how-it-works" id="how-it-works" ref={howItWorksRef} tabIndex={-1} aria-labelledby="how-it-works-title">
        <div className="how-heading">
          <p className="eyebrow">HOW VI$ION WORKS</p>
          <h2 id="how-it-works-title">Read all four together and the picture becomes much clearer.</h2>
          <p>Vi$ion is built around four fundamental parts of your financial picture. No single one tells the whole story.</p>
        </div>
        <div className="concept-grid">
          <article><span>01</span><h3>Cash Flow</h3><p>Understand the relationship between money coming in and money going out.</p></article>
          <article><span>02</span><h3>Capital</h3><p>Learn to think about savings and reserves not just as dollars, but as <strong>time</strong> — how long your resources can support you.</p></article>
          <article><span>03</span><h3>Collateral</h3><p>Understand the relationship between what you own, what it is worth, and what you still owe against it.</p></article>
          <article><span>04</span><h3>Credit</h3><p>Go beyond the score and understand credit as a way of communicating your borrowing history and financial behavior.</p></article>
        </div>
        <div className="question-panel">
          <p>Once you can see the picture, you can start asking better questions:</p>
          <ul><li>What happens if I pay this debt down?</li><li>Can I afford this purchase?</li><li>Would more reserves help me more than paying extra debt?</li><li>What changes if I use a Snowball instead of an Avalanche strategy?</li></ul>
          <strong>That is the purpose of Vi$ion.</strong>
        </div>
        <div className="explanation-grid">
          <article>
            <p className="eyebrow">BUILD YOUR AVATAR</p>
            <h3>Turn the numbers into a picture.</h3>
            <p>Start with <strong>seven basic inputs</strong> about your current financial situation. Planning a purchase? Open <strong>What If</strong> for five additional inputs and compare the scenario without changing your current picture.</p>
            <dl><div><dt>Cash Flow → Weapon</dt><dd>More room between take-home income and combined living and debt expenses means greater offensive strength.</dd></div><div><dt>Capital → Shield</dt><dd>More months of available reserves means stronger protection.</dd></div><div><dt>Collateral → Armor</dt><dd>More equity relative to debt strengthens your armor.</dd></div><div><dt>Credit → Antenna &amp; Wings</dt><dd>Your entered credit profile changes your avatar’s credit equipment and abilities.</dd></div></dl>
            <p>The point isn’t to make a “good” or “bad” character. <strong>The avatar gives you a way to see financial relationships that are normally trapped inside spreadsheets, percentages, and credit reports.</strong></p>
          </article>
          <article>
            <p className="eyebrow">THEN PLAY YOUR FINANCIAL PICTURE</p>
            <h3>Your avatar isn’t just decoration.</h3>
            <p>Take it into Vi$ion’s financial simulators and see those same concepts become gameplay.</p>
            <p>Battle debt. Reduce <strong>principal balances</strong>. Protect your reserves. Survive until payday. Decide whether disposable income should strengthen your next round or repair damaged defenses.</p>
            <p>Experiment with different debt strategies such as <strong>Avalanche and Snowball</strong> and watch how the same starting situation can produce very different results.</p>
            <p>The games don’t make financial decisions for you. <strong>They give you a place to see those decisions happen.</strong></p>
          </article>
        </div>
      </section>
      <section id="arcade" className="arcade-section">
        <div className="arcade-heading">
          <div>
            <p className="eyebrow">NEXT STOP / THE ARCADE</p>
            <h2>One avatar. New worlds.</h2>
            <p>Start with Debtbreak for financial decisions, or warm up with an arcade game.</p>
          </div>
          <span className="outline-label">
            4 PLAYABLE EXPERIENCES · 1 CONCEPT
          </span>
        </div>
        <div className="game-grid game-grid-expanded">
          <article className="game-card range-card">
            <div className="game-visual">
              <div className="range-grid" />
              <Crosshair className="range-reticle" strokeWidth={0.8} />
              <img
                src={character.image}
                alt=""
                width="1024"
                height="1536"
                loading="lazy"
              />
              <span className="game-status available">PLAYABLE DEMO</span>
            </div>
            <div className="game-info">
              <p>QUICK PLAY / 45 SECONDS</p>
              <h3>Pulse Range</h3>
              <span>
                Move. Aim. Fire. Feel your loadout respond in a no-fail training
                arena.
              </span>
              <Button
                className="game-play"
                disabled={!ready}
                onClick={() => setArenaOpen(true)}
              >
                Launch training <ArrowRight size={17} />
              </Button>
            </div>
          </article>
          <article className="game-card debt-card">
            <div className="game-visual">
              <img
                src={CHARACTERS.mech.image}
                alt=""
                width="1024"
                height="1536"
                loading="lazy"
              />
              <span className="game-status available">
                PLAYABLE TURRET PROTOTYPE
              </span>
              <span className="game-word" aria-hidden="true">
                BREAK
                <br />
                DEBT.
              </span>
            </div>
            <div className="game-info">
              <p>STRATEGY / FINANCIAL PERIODS</p>
              <h3>Debtbreak</h3>
              <span>
                Use your selected hangar picture to split income across living costs, credit payments and
                reserves. Protect your defenses, review the consequences, then replay.
              </span>
              <Button
                className="game-play"
                disabled={!ready}
                onClick={() => setSectorOpen(true)}
              >
                Play Debtbreaker <ArrowRight size={17} />
              </Button>
            </div>
          </article>
          <article className="game-card invaders-card">
            <div className="game-visual">
              <DebtInvadersPreview />
              <span className="game-status available">PLAYABLE PROTOTYPE</span>
            </div>
            <div className="game-info">
              <p>ARCADE DEFENSE / THREE WAVES</p>
              <h3>Debt Invaders</h3>
              <span>
                Hold the line. Cash flow sets your fire rate, capital powers
                shields, collateral builds cover, and credit sizes your ship.
              </span>
              <Button className="game-play" disabled={!ready || pending}
                onClick={() => setInvadersOpen(true)}>
                Play Debt Invaders <ArrowRight size={17} />
              </Button>
            </div>
          </article>
          <article className="game-card runner-card">
            <div className="game-visual">
              <WantsNeedsPreview />
              <span className="game-status available">PLAYABLE PROTOTYPE</span>
            </div>
            <div className="game-info">
              <p>SIDE-SCROLLING SHOOTER / THREE LEVELS</p>
              <h3>Wants vs. Needs</h3>
              <span>
                Run, jump and shoot past coffee cups and fast food. Face Land Lord,
                Car Magedon and Mortgage Maniac at the end of each street.
              </span>
              <Button className="game-play" disabled={!ready || pending} onClick={() => setRunnerOpen(true)}>
                Play Wants vs. Needs <ArrowRight size={17} />
              </Button>
            </div>
          </article>
          <article className="game-card canopy-card">
            <div className="game-visual">
              <img
                src={CHARACTERS.tree.image}
                alt=""
                width="1024"
                height="1536"
                loading="lazy"
              />
              <span className="game-status">GAME CONCEPT</span>
              <span className="game-word" aria-hidden="true">
                ROOM
                <br />
                TO GROW.
              </span>
            </div>
            <div className="game-info">
              <p>WORLD BUILDING / FUTURE WORLD</p>
              <h3>Canopy</h3>
              <span>
                Build a living world around your avatar. Small actions create
                room to grow.
              </span>
              <Button
                variant="ghost"
                className="concept-button"
                onClick={() => setConcept("canopy")}
              >
                Explore the concept <ArrowRight size={17} />
              </Button>
            </div>
          </article>
        </div>
        <div className="beta-band"><div><strong>Your feedback shapes the next release.</strong><p>Tell us what became clearer and where you got stuck.</p></div><BetaFeedback /></div>
      </section>
      <section className="planned-features" aria-labelledby="planned-features-title"><div><p className="eyebrow">PLANNED FEATURES</p><h2 id="planned-features-title">Your picture, with help when you want it.</h2></div><button onClick={() => setPlannedFeature("budget")}><WalletCards/><span><strong>Connect your budget</strong><small>Bring your financial picture into Vi$ion. Planned feature; connections are not available yet.</small></span></button><button onClick={() => setPlannedFeature("guide")}><MessageCircle/><span><strong>Vi$ion guide</strong><small>Ask about the four corners and your game choices. Planned feature; chat is not available yet.</small></span></button></section>
      <section id="engine" className="engine-section">
        <div>
          <p className="eyebrow">THE VI$ION ENGINE</p>
          <h2>
            A complicated life.
            <br />
            <span>Four clear corners.</span>
          </h2>
          <p>
            Cash flow, capital, collateral and credit turn a financial picture
            into an avatar. See what changes. Keep the decision yours.
          </p>
        </div>
        <div className="engine-details">
          <details>
            <summary>
              Understand your four corners <span>+</span>
            </summary>
            <div className="math-copy">
              <p>
                <strong>Cash flow:</strong> the breathing room in your monthly
                income and spending. The cash-flow strength reflects debt payments plus living expenses, not a debt-only DTI ratio.
              </p>
              <p>
                <strong>Capital:</strong> the liquid reserves available to meet
                expenses.
              </p>
              <p>
                <strong>Collateral:</strong> your equity position across assets
                and debt.
              </p>
              <p>
                <strong>Credit:</strong> your record of borrowing and repayment, represented here by the
                score you enter. Read terms and communicate early about payment problems. A blank score stays unknown.
              </p>
              <p>
                The attributes use a 0–100 display scale. Negative dollar values
                stay visible. There is no combined financial grade or
                recommended decision.
              </p>
            </div>
          </details>
          <details>
            <summary>
              How does this become a game? <span>+</span>
            </summary>
            <div className="math-copy">
              <p>
                Debtbreaker uses your selected hangar picture to fund living costs, credit payments and reserve deposits in a simulation. The hangar calculator stays separate.
              </p>
              <p>
                Every income shot transfers a fixed amount to the selected destination. Reserve fire and automatic pillar interception draw from the same vault, so money cannot be duplicated.
              </p>
              <p>
                Unpaid obligations can damage defenses and remain in arrears. Classic and challenge modes use fictional practice scenarios with their own choices; those choices are not predictions for your accounts.
              </p>
              <p>
                Hangar-driven Debtbreaker keeps the credit grade from your selected picture. Splitting one payment into more shots earns no extra payment history. The game cannot spend
                money, contact creditors, or change your actual finances.
              </p>
              <p>
                Sentinel and Verdant are original articulated 3D characters. The
                same model responds to inputs in the hangar and moves, fires and
                shields inside Debtbreak. Concept illustrations remain available
                as a separate view.
              </p>
            </div>
          </details>
        </div>
      </section>
      <nav className="mobile-dock" aria-label="Quick navigation">
        <a href="#avatar">
          <Orbit size={20} aria-hidden="true" />
          <span>Avatar</span>
        </a>
        <a href="#picture">
          <SlidersHorizontal size={20} aria-hidden="true" />
          <span>Inputs</span>
        </a>
        <a href="#forces">
          <Shield size={20} aria-hidden="true" />
          <span>Forces</span>
        </a>
        <a href="#arcade">
          <Gamepad2 size={20} aria-hidden="true" />
          <span>Play</span>
        </a>
      </nav>
      <footer>
        <a className="brand" href="#">
          VI<span>$</span>ION
        </a>
        <p>Financial awareness. Built for play.</p>
        <a href="/welcome">About Vi$ion &amp; contact</a>
        <span>PROTOTYPE / MANUAL INPUTS</span>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <VisionWelcome onBuild={() => moveTo("inputs")} onHow={() => moveTo("how")} />
      <Dialog open={sectorOpen} onOpenChange={setSectorOpen}>
        <DialogContent className="sector-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>Debtbreak financial practice</DialogTitle>
            <DialogDescription>
              Play and review monthly obligations from your selected hangar picture. Game actions do not change your inputs or move real money.
            </DialogDescription>
          </DialogHeader>
          {sectorOpen && (
            <DebtbreakArena
              avatar={avatar}
              strengths={strengths}
              ltv={
                active.corners.collateral.raw.debtToValue === null
                  ? null
                  : Number(active.corners.collateral.raw.debtToValue)
              }
              picture={snapshot}
              hangar={active}
              visualState={visualState}
              onExit={() => setSectorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={invadersOpen} onOpenChange={setInvadersOpen}>
        <DialogContent className="invaders-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>Debt Invaders</DialogTitle>
            <DialogDescription>
              Defend against three waves using your selected hangar loadout.
              Move left and right, fire at the invaders, and protect your ship.
            </DialogDescription>
          </DialogHeader>
          {invadersOpen && <DebtInvadersArena strengths={strengths} picture={snapshot}
            onExit={() => setInvadersOpen(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={runnerOpen} onOpenChange={setRunnerOpen}>
        <DialogContent className="runner-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>Wants vs. Needs</DialogTitle>
            <DialogDescription>
              A side-scrolling shooter with three levels. Cash flow controls fire rate,
              capital provides shields, collateral sets jump height, and credit sets speed.
            </DialogDescription>
          </DialogHeader>
          {runnerOpen && <WantsNeedsArena strengths={strengths} picture={snapshot} onExit={() => setRunnerOpen(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={arenaOpen} onOpenChange={setArenaOpen}>
        <DialogContent className="arena-dialog">
          <DialogHeader>
            <DialogTitle>
              Pulse Range <span className="dialog-tag">TRAINING DEMO</span>
            </DialogTitle>
            <DialogDescription>
              {character.name} ·{" "}
              {snapshot === "current" ? "Current" : "What-if"} loadout. Move,
              aim and hit the targets. Every loadout is playable.
            </DialogDescription>
          </DialogHeader>
          {arenaOpen && <TrainingArena avatar={avatar} strengths={strengths} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={concept !== null}
        onOpenChange={(open) => {
          if (!open) setConcept(null);
        }}
      >
        <DialogContent className="concept-dialog">
          <DialogHeader>
            <DialogTitle>Canopy</DialogTitle>
            <DialogDescription>
              A future game concept. This world is not playable yet.
            </DialogDescription>
          </DialogHeader>
          <img src={CHARACTERS.tree.image} alt="" className="concept-image" />
          <p>
            A living world that grows alongside your avatar. Roots, canopy,
            leaves and trunk make the four corners visible. Small, repeatable
            actions create room to grow, while the tree remains healthy and
            complete at every starting point.
          </p>
          <Button
            disabled={!ready}
            onClick={() => {
              setConcept(null);
              setArenaOpen(true);
            }}
          >
            Try the training demo <ArrowRight size={16} />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={plannedFeature !== null} onOpenChange={(open) => { if (!open) setPlannedFeature(null); }}>
        <DialogContent className="planned-dialog">
          <DialogHeader><DialogTitle>{plannedFeature === "budget" ? "Connect your budget" : "Vi$ion guide"} <span className="dialog-tag">PLANNED</span></DialogTitle><DialogDescription>{plannedFeature === "budget" ? "Bring your financial picture into Vi$ion. Connections are not available yet." : "Ask about the four corners and your game choices. Chat is not available yet."}</DialogDescription></DialogHeader>
          <p>No account credentials, banking connection or chat message is collected in this prototype.</p>
          <Button onClick={() => setPlannedFeature(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
