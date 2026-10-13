"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  ArrowRight,
  ArrowLeft,
  ReceiptText,
  Copy,
  Check,
  Users,
  CheckCircle2,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  Compass,
  Utensils,
  Car,
  Hotel,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  RotateCcw,
  Circle,
} from "lucide-react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import MemberAvatar from "@/components/plan/MemberAvatar";
import Stamp from "@/components/ui/stamp";
import {
  INPUT,
  FIELD_LABEL,
  PRIMARY_BUTTON,
  OUTLINE_BUTTON,
  GHOST_BUTTON,
  choiceClass,
} from "@/components/plan/styles";
import { fillTemplate, type AgeGroup } from "@/lib/plan-draft";
import { useSavedProfiles } from "@/lib/saved-members-store";
import { useMessages } from "@/lib/use-messages";
import { useLocale } from "@/lib/use-locale";
import type { Expense, SplitBillResponse } from "@/app/api/split-bill/route";

type ExpenseItem = Expense & {
  category?: string;
  notes?: string[];
  baseAmount?: string;
  rawTax?: string;
  extraAmount?: string;
};

type Stage = "crew" | "expenses" | "results";

const STORAGE_KEY = "kancara-split-bill-draft-v1";
const SETTLED_STORAGE_KEY = "kancara-split-bill-settled-v1";


const CATEGORIES = [
  { key: "food", icon: Utensils, labelKey: "categoryFood" as const, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "transport", icon: Car, labelKey: "categoryTransport" as const, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "lodging", icon: Hotel, labelKey: "categoryLodging" as const, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "activity", icon: Ticket, labelKey: "categoryActivity" as const, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "shopping", icon: ShoppingBag, labelKey: "categoryShopping" as const, color: "text-pink-600 bg-pink-50 border-pink-200" },
  { key: "other", icon: MoreHorizontal, labelKey: "categoryOther" as const, color: "text-slate-600 bg-slate-50 border-slate-200" },
] as const;

export default function SplitBillClient() {
  const t = useMessages("splitBill");
  const locale = useLocale();
  const numLocale = locale === "id" ? "id-ID" : "en-US";

  const [stage, setStage] = useState<Stage>("crew");
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newTax, setNewTax] = useState("");
  const [newExtra, setNewExtra] = useState("");
  const [newPayer, setNewPayer] = useState("");
  const [newCategory, setNewCategory] = useState<string>("food");
  const [newConsumers, setNewConsumers] = useState<string[]>([]);

  const [result, setResult] = useState<SplitBillResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedItem, setCopiedItem] = useState<number | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const { profiles } = useSavedProfiles();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [confirmedSettlements, setConfirmedSettlements] = useState<Record<string, boolean>>({});

  const receiptRef = useRef<HTMLDivElement | null>(null);

  // Restore saved draft & settlement confirmations on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.members) && parsed.members.length > 0) {
          setMembers(parsed.members);
        }
        if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
          setExpenses(parsed.expenses);
        }
      }
      const rawSettled = localStorage.getItem(SETTLED_STORAGE_KEY);
      if (rawSettled) {
        setConfirmedSettlements(JSON.parse(rawSettled));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Persist draft to localStorage
  useEffect(() => {
    try {
      if (members.length > 0 || expenses.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ members, expenses, updatedAt: Date.now() })
        );
      }
    } catch {
      // Ignore storage error
    }
  }, [members, expenses]);

  const effectivePayer = newPayer || members[0] || "";

  const handleAddMember = () => {
    const trimmed = newMember.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      if (!newPayer) setNewPayer(trimmed);
      setNewMember("");
    }
  };

  // Aggregate saved profiles from Neon DB /api/saved-profiles, localStorage, and draft trip
  const allAvailableProfiles = useMemo(() => {
    type ImportableProfile = {
      id: string;
      name: string;
      relationship?: string;
      ageGroup: AgeGroup;
      notes?: string;
    };

    const list: ImportableProfile[] = [];
    const seen = new Set<string>();

    // 1. From saved profiles (Neon DB /api/saved-profiles + localStorage store)
    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        const trimmed = p.name?.trim();
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          list.push({
            id: p.id,
            name: trimmed,
            relationship: p.relationship || (locale === "id" ? "Keluarga" : "Family"),
            ageGroup: p.ageGroup || "adult",
            notes: p.notes,
          });
        }
      }
    }

    // 2. From trip plan draft in localStorage if any additional members exist
    try {
      const planRaw = localStorage.getItem("kancara-plan-draft-v2");
      if (planRaw) {
        const plan = JSON.parse(planRaw);
        if (Array.isArray(plan.members)) {
          for (const m of plan.members) {
            const mName = m?.name?.trim();
            if (mName && !seen.has(mName.toLowerCase())) {
              seen.add(mName.toLowerCase());
              list.push({
                id: m.id || crypto.randomUUID(),
                name: mName,
                relationship: "Trip Plan",
                ageGroup: m.ageGroup || "adult",
              });
            }
          }
        }
      }
    } catch {}

    return list;
  }, [profiles, locale]);

  const unaddedProfiles = useMemo(
    () => allAvailableProfiles.filter((p) => !members.includes(p.name)),
    [allAvailableProfiles, members],
  );

  const handleOpenImportModal = () => {
    // Pre-select all unadded profiles by default
    setSelectedImportIds(unaddedProfiles.map((p) => p.id));
    setIsImportModalOpen(true);
  };

  const handleToggleSelectImport = (id: string) => {
    setSelectedImportIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedImportIds.length === unaddedProfiles.length && unaddedProfiles.length > 0) {
      setSelectedImportIds([]);
    } else {
      setSelectedImportIds(unaddedProfiles.map((p) => p.id));
    }
  };

  const handleImportSingle = (name: string) => {
    if (members.includes(name)) return;
    const updated = [...members, name];
    setMembers(updated);
    if (!newPayer) setNewPayer(updated[0]);
    setImportNotification(fillTemplate(t.importSuccess, { count: 1 }));
    setTimeout(() => setImportNotification(null), 3000);
  };

  const handleConfirmBatchImport = () => {
    const toAdd = allAvailableProfiles
      .filter((p) => selectedImportIds.includes(p.id) && !members.includes(p.name))
      .map((p) => p.name);

    if (toAdd.length === 0) {
      setIsImportModalOpen(false);
      return;
    }

    const merged = Array.from(new Set([...members, ...toAdd]));
    setMembers(merged);
    if (!newPayer && merged.length > 0) setNewPayer(merged[0]);
    setImportNotification(fillTemplate(t.importSuccess, { count: toAdd.length }));
    setTimeout(() => setImportNotification(null), 3500);
    setIsImportModalOpen(false);
  };


  const handleRemoveMember = (m: string) => {
    const remaining = members.filter((x) => x !== m);
    setMembers(remaining);
    setNewConsumers(newConsumers.filter((c) => c !== m));
    if (newPayer === m) setNewPayer(remaining[0] || "");

    setExpenses(
      expenses
        .filter((x) => x.paidBy !== m)
        .map((exp) => ({
          ...exp,
          sharedBy: exp.sharedBy ? exp.sharedBy.filter((c) => c !== m) : undefined,
        }))
    );
  };

  const toggleConsumer = (m: string) => {
    if (newConsumers.includes(m)) {
      setNewConsumers(newConsumers.filter((c) => c !== m));
    } else {
      setNewConsumers([...newConsumers, m]);
    }
  };

  const toggleAllConsumers = () => {
    if (newConsumers.length === members.length) {
      setNewConsumers([]);
    } else {
      setNewConsumers([...members]);
    }
  };

  const parseMath = (val: string): number => {
    if (!val) return 0;
    let sanitized = val.replace(/\./g, "").replace(/,/g, ".").replace(/%/g, "/100");
    sanitized = sanitized.replace(/[^-()\d/*+.]/g, "");
    if (!sanitized) return 0;
    try {
      const parsed = new Function("return " + sanitized)();
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const val = e.target.value;
    if (/^[0-9+\-*/%.,() ]*$/.test(val)) {
      setter(val);
    }
  };

  const handleMathEval = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      if (!value.trim()) return;

      if (value.trim().endsWith("%")) {
        const formula = value.replace(/%$/, "");
        const res = parseMath(formula);
        setter(res.toLocaleString(numLocale) + "%");
      } else {
        setter(parseMath(value).toLocaleString(numLocale));
      }
    }
  };

  const handleAddExpense = () => {
    if (newDesc.trim() && newAmount && effectivePayer) {
      const baseAmt = parseMath(newAmount);

      let taxNominal = 0;
      let taxIsPercent = false;
      const rawTaxStr = newTax.trim();
      if (rawTaxStr.includes("%")) {
        taxIsPercent = true;
        const rate = parseMath(rawTaxStr.replace("%", ""));
        taxNominal = baseAmt * (rate / 100);
      } else {
        taxNominal = parseMath(rawTaxStr);
      }

      const extraAmt = parseMath(newExtra);
      const finalAmount = Math.round(baseAmt + taxNominal + extraAmt);

      const notes: string[] = [];
      if (taxNominal > 0 || extraAmt > 0) {
        notes.push(`Rp ${baseAmt.toLocaleString(numLocale)} ${t.noteBase}`);
        if (taxNominal > 0) {
          notes.push(
            taxIsPercent
              ? `+${rawTaxStr.replace("%", "")}% ${t.noteTax}`
              : `+Rp ${Math.round(taxNominal).toLocaleString(numLocale)} ${t.noteTax}`
          );
        }
        if (extraAmt > 0) notes.push(`+Rp ${Math.round(extraAmt).toLocaleString(numLocale)} ${t.noteExtra}`);
      }

      const item: ExpenseItem = {
        id: editingId || Math.random().toString(),
        description: newDesc.trim(),
        amount: finalAmount,
        paidBy: effectivePayer,
        category: newCategory,
        sharedBy: newConsumers.length > 0 ? newConsumers : members,
        notes,
        baseAmount: newAmount,
        rawTax: newTax,
        extraAmount: newExtra,
      };

      if (editingId) {
        setExpenses(expenses.map((exp) => (exp.id === editingId ? item : exp)));
        setEditingId(null);
      } else {
        setExpenses([...expenses, item]);
      }

      setNewDesc("");
      setNewAmount("");
      setNewTax("");
      setNewExtra("");
      setNewConsumers([]);
    }
  };

  const handleEditExpense = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setNewDesc(exp.description);
    setNewAmount(exp.baseAmount || String(exp.amount));
    setNewTax(exp.rawTax || "");
    setNewExtra(exp.extraAmount || "");
    setNewPayer(exp.paidBy);
    setNewCategory(exp.category || "food");
    if (exp.sharedBy && exp.sharedBy.length > 0 && exp.sharedBy.length < members.length) {
      setNewConsumers(exp.sharedBy);
    } else {
      setNewConsumers([]);
    }
    setStage("expenses");
    setTimeout(() => document.getElementById("descInput")?.focus(), 100);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewDesc("");
    setNewAmount("");
    setNewTax("");
    setNewExtra("");
    setNewConsumers([]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((x) => x.id !== id));
    if (editingId === id) handleCancelEdit();
  };

  const applyTaxPercent = (pct: number) => {
    setNewTax(`${pct}%`);
  };

  const applyExtraNominal = (nom: number) => {
    setNewExtra(nom.toLocaleString(numLocale));
  };

  // Sync split bill calculation
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      if (members.length === 0 || expenses.length === 0) {
        if (!ignore) setResult(null);
        return;
      }

      try {
        const res = await fetch("/api/split-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members, expenses }),
        });
        if (res.ok && !ignore) {
          const data = await res.json();
          setResult(data);
        }
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [members, expenses]);

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const map = new Map<string, number>();

    expenses.forEach((e) => {
      const cat = e.category || "other";
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });

    return CATEGORIES.map((c) => {
      const amount = map.get(c.key) || 0;
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      return {
        ...c,
        amount,
        percentage: pct,
        label: t[c.labelKey],
      };
    }).filter((c) => c.amount > 0);
  }, [expenses, t]);

  // Transparent calculation per member
  const memberBreakdowns = useMemo(() => {
    if (!members.length) return [];
    return members.map((m, idx) => {
      const paidExpenses = expenses.filter((e) => e.paidBy === m);
      const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);

      const consumedItems = expenses
        .filter((e) => {
          const consumers = e.sharedBy && e.sharedBy.length > 0 ? e.sharedBy : members;
          return consumers.includes(m);
        })
        .map((e) => {
          const consumers = e.sharedBy && e.sharedBy.length > 0 ? e.sharedBy : members;
          const myShare = Math.round(e.amount / consumers.length);
          return {
            id: e.id,
            description: e.description,
            category: e.category,
            totalAmount: e.amount,
            myShare,
            payer: e.paidBy,
            isPayer: e.paidBy === m,
            consumerCount: consumers.length,
          };
        });

      const totalShare = consumedItems.reduce((sum, item) => sum + item.myShare, 0);
      const netBalance = totalPaid - totalShare;

      return {
        name: m,
        avatarIdx: idx,
        totalPaid,
        totalShare,
        netBalance,
        consumedItems,
      };
    });
  }, [members, expenses]);

  const toggleSettlementConfirmed = (key: string) => {
    setConfirmedSettlements((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(SETTLED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleMarkAllSettlementsPaid = () => {
    if (!result?.settlements) return;
    const next: Record<string, boolean> = { ...confirmedSettlements };
    result.settlements.forEach((s) => {
      const key = `${s.from}->${s.to}:${s.amount}`;
      next[key] = true;
    });
    setConfirmedSettlements(next);
    try {
      localStorage.setItem(SETTLED_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleResetSettlementConfirmations = () => {
    setConfirmedSettlements({});
    try {
      localStorage.removeItem(SETTLED_STORAGE_KEY);
    } catch {}
  };

  const settlementStats = useMemo(() => {
    if (!result || !result.settlements || result.settlements.length === 0) {
      return { totalCount: 0, paidCount: 0, totalAmount: 0, paidAmount: 0, isAllPaid: false, percentage: 0 };
    }
    const totalCount = result.settlements.length;
    let paidCount = 0;
    let totalAmount = 0;
    let paidAmount = 0;

    result.settlements.forEach((s) => {
      const key = `${s.from}->${s.to}:${s.amount}`;
      totalAmount += s.amount;
      if (confirmedSettlements[key]) {
        paidCount++;
        paidAmount += s.amount;
      }
    });

    const isAllPaid = totalCount > 0 && paidCount === totalCount;
    const percentage = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    return { totalCount, paidCount, totalAmount, paidAmount, isAllPaid, percentage };
  }, [result, confirmedSettlements]);

  // Copy plain text summary without emojis
  const handleCopySummary = () => {
    if (!result) return;
    const lines = [
      `=== ${t.receiptBrand} ===`,
      `${t.totalExpense}: Rp ${result.totalExpense.toLocaleString(numLocale)}`,
      `${t.perPerson}: Rp ${Math.round(result.perPerson).toLocaleString(numLocale)}`,
      "",
      `=== ${t.categorySummary} ===`,
    ];

    categoryStats.forEach((c) => {
      lines.push(`- ${c.label}: Rp ${c.amount.toLocaleString(numLocale)} (${c.percentage}%)`);
    });

    lines.push("");
    lines.push(`=== ${t.memberBreakdown} ===`);

    memberBreakdowns.forEach((mb) => {
      const statusText =
        mb.netBalance > 0
          ? `${t.netReceive} Rp ${mb.netBalance.toLocaleString(numLocale)}`
          : mb.netBalance < 0
          ? `${t.netPay} Rp ${Math.abs(mb.netBalance).toLocaleString(numLocale)}`
          : t.netEven;

      lines.push(`- ${mb.name}:`);
      lines.push(`  * ${t.totalShare}: Rp ${mb.totalShare.toLocaleString(numLocale)}`);
      lines.push(`  * ${t.totalPaid}: Rp ${mb.totalPaid.toLocaleString(numLocale)}`);
      lines.push(`  * Status: ${statusText}`);
    });

    lines.push("");
    lines.push(`=== ${t.settlements} ===`);

    if (result.settlements.length === 0) {
      lines.push(`- ${t.noDebts}`);
    } else {
      result.settlements.forEach((s) => {
        const isPaid = !!confirmedSettlements[`${s.from}->${s.to}:${s.amount}`];
        lines.push(`- ${s.from} -> ${s.to}: Rp ${s.amount.toLocaleString(numLocale)} [${isPaid ? "LUNAS" : "BELUM BAYAR"}]`);
      });
      lines.push("");
      lines.push(`Status Pembayaran: ${settlementStats.paidCount}/${settlementStats.totalCount} lunas (${settlementStats.percentage}%)`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy single debt reminder without emojis
  const handleCopySingleDebt = (s: { from: string; to: string; amount: number }, index: number) => {
    const text = fillTemplate(t.copyDebtMsg, {
      debtor: s.from,
      amount: s.amount.toLocaleString(numLocale),
      creditor: s.to,
    });
    navigator.clipboard.writeText(text);
    setCopiedItem(index);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  // Download high-resolution PNG receipt photo via Canvas
  const handleDownloadPhoto = () => {
    if (!result) return;
    setDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      const scale = 2;
      const width = 900;

      const headerH = 120;
      const statsH = 140;
      const catH = categoryStats.length > 0 ? 90 : 0;
      const memberRowsH = memberBreakdowns.length * 60 + 80;
      const settlementRowsH = Math.max(1, result.settlements.length) * 55 + 80;
      const footerH = 80;
      const totalH = headerH + statsH + catH + memberRowsH + settlementRowsH + footerH + 40;

      canvas.width = width * scale;
      canvas.height = totalH * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      ctx.fillStyle = "#F8FAFB";
      ctx.fillRect(0, 0, width, totalH);

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, width - 40, totalH - 40);

      ctx.fillStyle = "#004649";
      ctx.fillRect(20, 20, width - 40, 90);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(t.receiptBrand, 45, 60);

      ctx.fillStyle = "#A9E1EC";
      ctx.font = "14px 'Montserrat', sans-serif";
      ctx.fillText(`Kancara Travel • ${formattedDate}`, 45, 88);

      let y = 140;

      // Box 1: Total
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#E2E8F0";
      ctx.fillRect(45, y, 380, 95);
      ctx.strokeRect(45, y, 380, 95);

      ctx.fillStyle = "#64748B";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(t.totalExpense.toUpperCase(), 65, y + 30);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`Rp ${result.totalExpense.toLocaleString(numLocale)}`, 65, y + 68);

      // Box 2: Per Person
      ctx.fillStyle = "#EFF9F9";
      ctx.strokeStyle = "#8CC4C6";
      ctx.fillRect(455, y, 400, 95);
      ctx.strokeRect(455, y, 400, 95);

      ctx.fillStyle = "#035D60";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(t.perPerson.toUpperCase(), 475, y + 30);

      ctx.fillStyle = "#035D60";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`Rp ${Math.round(result.perPerson).toLocaleString(numLocale)}`, 475, y + 68);

      // Section: Categories if present
      if (categoryStats.length > 0) {
        y += 130;
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(t.categorySummary, 45, y);

        y += 25;
        let catX = 45;
        categoryStats.slice(0, 4).forEach((c) => {
          ctx.fillStyle = "#E2E8F0";
          ctx.fillRect(catX, y, 180, 32);
          ctx.fillStyle = "#1E293B";
          ctx.font = "12px sans-serif";
          ctx.fillText(`${c.label}: Rp ${c.amount.toLocaleString(numLocale)}`, catX + 10, y + 20);
          catX += 190;
        });
      }

      // Section: Member Breakdown
      y += 55;
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(t.memberBreakdown, 45, y);

      y += 20;
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(t.tableMember, 45, y);
      ctx.fillText(t.tableShare, 260, y);
      ctx.fillText(t.tablePaid, 480, y);
      ctx.fillText(t.tableStatus, 700, y);

      y += 10;
      ctx.strokeStyle = "#CBD5E1";
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(855, y);
      ctx.stroke();

      memberBreakdowns.forEach((mb) => {
        y += 35;
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(mb.name, 45, y);

        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#334155";
        ctx.fillText(`Rp ${mb.totalShare.toLocaleString(numLocale)}`, 260, y);
        ctx.fillText(`Rp ${mb.totalPaid.toLocaleString(numLocale)}`, 480, y);

        if (mb.netBalance > 0) {
          ctx.fillStyle = "#15803D";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(`+Rp ${mb.netBalance.toLocaleString(numLocale)}`, 700, y);
        } else if (mb.netBalance < 0) {
          ctx.fillStyle = "#DC2626";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(`-Rp ${Math.abs(mb.netBalance).toLocaleString(numLocale)}`, 700, y);
        } else {
          ctx.fillStyle = "#64748B";
          ctx.font = "14px sans-serif";
          ctx.fillText(`Rp 0 (${t.netEven})`, 700, y);
        }
      });

      // Section: Settlements
      y += 50;
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(t.settlements, 45, y);

      y += 15;
      ctx.strokeStyle = "#CBD5E1";
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(855, y);
      ctx.stroke();

      if (result.settlements.length === 0) {
        y += 35;
        ctx.fillStyle = "#15803D";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(`[${t.receiptStamp}] ${t.noDebts}`, 45, y);
      } else {
        result.settlements.forEach((s) => {
          y += 35;
          const key = `${s.from}->${s.to}:${s.amount}`;
          const isPaid = !!confirmedSettlements[key];

          ctx.fillStyle = isPaid ? "#15803D" : "#DC2626";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(s.from, 45, y);

          ctx.fillStyle = "#64748B";
          ctx.font = "13px sans-serif";
          ctx.fillText(t.tablePayTo, 180, y);

          ctx.fillStyle = "#15803D";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(s.to, 340, y);

          ctx.fillStyle = isPaid ? "#15803D" : "#0F172A";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText(`Rp ${s.amount.toLocaleString(numLocale)}`, 620, y);

          if (isPaid) {
            ctx.fillStyle = "#15803D";
            ctx.font = "bold 13px sans-serif";
            ctx.fillText("[LUNAS]", 800, y);
          } else {
            ctx.fillStyle = "#94A3B8";
            ctx.font = "13px sans-serif";
            ctx.fillText("[BELUM]", 800, y);
          }
        });
      }

      // Footer
      y += 60;
      ctx.strokeStyle = "#E2E8F0";
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(855, y);
      ctx.stroke();

      y += 30;
      ctx.fillStyle = "#94A3B8";
      ctx.font = "12px sans-serif";
      ctx.fillText(t.canvasFooter, 45, y);

      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kancara-split-bill-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  };

  const steps = [
    {
      key: "crew" as Stage,
      label: t.stepMembers,
      done: members.length >= 1,
      current: stage === "crew",
      onSelect: () => setStage("crew"),
    },
    {
      key: "expenses" as Stage,
      label: t.stepExpenses,
      done: expenses.length > 0,
      current: stage === "expenses",
      onSelect: members.length > 0 ? () => setStage("expenses") : null,
    },
    {
      key: "results" as Stage,
      label: t.stepResults,
      done: result !== null && expenses.length > 0,
      current: stage === "results",
      onSelect: expenses.length > 0 ? () => setStage("results") : null,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.current);
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="relative isolate mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <PageBackdrop />

      {/* Hero Header */}
      <div className="relative mx-auto w-full max-w-3xl text-center motion-safe:animate-message-in">
        <div
          aria-hidden="true"
          className="parallax-top pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] [--parallax-to:10rem]"
        >
          <div className="aspect-square w-[500px] rounded-full bg-gradient-to-tr from-primary/40 to-transparent" />
        </div>

        <h1
          tabIndex={-1}
          className="font-heading text-4xl font-extrabold tracking-tight text-balance text-text outline-none sm:text-5xl lg:text-6xl"
        >
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body leading-relaxed text-pretty text-text-muted sm:text-h3">
          {t.subtitle}
        </p>

        {importNotification && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-primary/30 bg-primary-subtle p-3 text-caption font-medium text-primary motion-safe:animate-message-in">
            {importNotification}
          </div>
        )}
      </div>

      {/* StageRail (Stage Stepper matching /plan) */}
      <nav aria-label={t.badge} className="motion-safe:animate-fade-in">
        <ol className="hidden items-center gap-1 lg:flex">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const content = (
              <>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-bold tabular-nums transition-[background-color,border-color,color] duration-300 ${
                    step.done
                      ? "border-primary bg-primary text-on-primary"
                      : step.current
                      ? "border-primary text-primary"
                      : "border-current"
                  }`}
                >
                  {step.done ? (
                    <Check className="size-4" strokeWidth={3.5} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.label}
                {step.done && <span className="sr-only">{t.stepDone}</span>}
                {!step.current && !step.onSelect && <span className="sr-only">{t.stepLocked}</span>}
              </>
            );

            return (
              <li key={step.key} className={`flex items-center gap-1 ${isLast ? "" : "flex-1"}`}>
                {step.current && (
                  <span
                    aria-current="step"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-label font-bold text-primary whitespace-nowrap"
                  >
                    {content}
                  </span>
                )}
                {!step.current && step.onSelect === null && (
                  <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-label text-text-muted opacity-50 whitespace-nowrap">
                    {content}
                  </span>
                )}
                {!step.current && step.onSelect !== null && (
                  <button
                    type="button"
                    onClick={step.onSelect}
                    className="inline-flex min-h-11 cursor-pointer shrink-0 items-center justify-center gap-2 rounded-full px-3 text-label text-text-muted transition-[background-color,color] duration-150 ease-out hover:bg-surface-muted hover:text-text whitespace-nowrap"
                  >
                    {content}
                  </button>
                )}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`h-px min-w-4 flex-1 transition-colors duration-300 ${
                      step.done ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile Stage Rail */}
        {currentStep && (
          <div className="lg:hidden">
            <div aria-hidden="true" className="flex gap-1.5">
              {steps.map((step) => (
                <span
                  key={step.key}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    step.current
                      ? "bg-primary"
                      : step.done
                      ? "bg-primary/50"
                      : "bg-border-strong/30"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-label text-text">
              <span className="text-primary tabular-nums">
                {fillTemplate(t.stepOf, {
                  current: currentStepIndex + 1,
                  total: steps.length,
                })}
              </span>
              {currentStep.label}
            </p>
            {nextStep && (
              <p className="mt-1 text-caption text-text-muted">
                {fillTemplate(t.stepNext, { name: nextStep.label })}
              </p>
            )}
          </div>
        )}
      </nav>

      {/* STAGE 1: ANGGOTA (CREW) */}
      {stage === "crew" && (
        <div className="space-y-6 motion-safe:animate-message-in">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Users className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-h2 text-text">{t.members}</h2>
                  <p className="text-caption text-text-muted">
                    {members.length > 0
                      ? fillTemplate(t.memberCount, { count: members.length })
                      : t.emptyMembers}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenImportModal}
                  className={`${OUTLINE_BUTTON} h-10 px-4 text-caption text-primary hover:border-primary flex items-center gap-2`}
                  title={t.importFromPlan}
                >
                  <Users className="size-4" />
                  <span>{t.importPrompt}</span>
                  {unaddedProfiles.length > 0 && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {unaddedProfiles.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Input Form for Member */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                placeholder={t.memberPlaceholder}
                className={INPUT}
              />
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!newMember.trim()}
                className={`${PRIMARY_BUTTON} shrink-0 px-6`}
              >
                <Plus className="size-5" />
                {t.addMember}
              </button>
            </div>

            {/* Members Grid with MemberAvatar */}
            {members.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 pt-2">
                {members.map((m, idx) => (
                  <div
                    key={m}
                    className="group relative flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5 shadow-sm transition-[border-color,background-color] hover:border-primary/40 hover:bg-surface-muted"
                  >
                    <MemberAvatar
                      ageGroup="adult"
                      variant={idx}
                      className="size-11 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate font-heading text-body font-semibold text-text">
                      {m}
                    </span>
                    <button
                      type="button"
                      aria-label={fillTemplate(t.deleteMember, { name: m })}
                      title={fillTemplate(t.deleteMember, { name: m })}
                      onClick={() => handleRemoveMember(m)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-error-subtle hover:text-error"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border-strong/40 p-8 text-center">
                <Users className="mx-auto size-10 text-text-muted/40" />
                <p className="mt-3 text-body-sm text-text-muted italic">{t.emptyMembers}</p>
                <p className="mt-1 text-caption text-text-muted/70">{t.typeMemberHint}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={members.length === 0}
              onClick={() => setStage("expenses")}
              className={`${PRIMARY_BUTTON} h-14 px-8 text-label-lg shadow-md shadow-primary/20`}
            >
              {t.nextToExpenses}
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: PENGELUARAN (EXPENSES) */}
      {stage === "expenses" && (
        <div className="space-y-6 motion-safe:animate-message-in">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary-subtle text-secondary">
                  <ReceiptText className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-h2 text-text">{t.expenses}</h2>
                  <p className="text-caption text-text-muted">
                    {expenses.length > 0
                      ? fillTemplate(t.expenseCount, { count: expenses.length })
                      : t.emptyExpenses}
                  </p>
                </div>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-label text-text-muted hover:text-error transition-colors cursor-pointer"
                >
                  {t.cancelEdit}
                </button>
              )}
            </div>

            {/* Input Form Fields */}
            <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
              <div>
                <label className={FIELD_LABEL}>{t.itemLabel}</label>
                <input
                  id="descInput"
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t.descPlaceholder}
                  className={`mt-1.5 ${INPUT}`}
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className={FIELD_LABEL}>{t.categories}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = newCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setNewCategory(cat.key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary text-on-primary shadow-sm"
                            : "border-border bg-surface text-text hover:border-primary/50"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        <span>{t[cat.labelKey]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className={FIELD_LABEL}>{t.baseNominal}</label>
                    <span className="text-caption text-text-muted/70">{t.typeToCalculate}</span>
                  </div>
                  <input
                    type="text"
                    value={newAmount}
                    onChange={(e) => handleNumericInput(e, setNewAmount)}
                    onKeyDown={(e) => handleMathEval(e, newAmount, setNewAmount)}
                    placeholder={t.baseNominalPlaceholder}
                    className={`mt-1.5 ${INPUT}`}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}>{t.paidByLabel}</label>
                  <select
                    value={effectivePayer}
                    onChange={(e) => setNewPayer(e.target.value)}
                    className={`mt-1.5 ${INPUT} appearance-none`}
                  >
                    <option value="" disabled>
                      {t.selectMember}
                    </option>
                    {members.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tax & Extra Inputs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
                <div>
                  <label className={FIELD_LABEL}>
                    {t.taxLabel} <span className="text-text-muted/60 lowercase">{t.taxOptional}</span>
                  </label>
                  <input
                    type="text"
                    value={newTax}
                    onChange={(e) => handleNumericInput(e, setNewTax)}
                    onKeyDown={(e) => handleMathEval(e, newTax, setNewTax)}
                    placeholder={t.taxPlaceholder}
                    className={`mt-1.5 ${INPUT}`}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTaxPercent(11)}
                      className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-caption font-semibold text-text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      {t.taxPpn}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTaxPercent(5)}
                      className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-caption font-semibold text-text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      {t.taxService}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={FIELD_LABEL}>
                    {t.extraLabel} <span className="text-text-muted/60 lowercase">{t.extraOptional}</span>
                  </label>
                  <input
                    type="text"
                    value={newExtra}
                    onChange={(e) => handleNumericInput(e, setNewExtra)}
                    onKeyDown={(e) => handleMathEval(e, newExtra, setNewExtra)}
                    placeholder={t.extraPlaceholder}
                    className={`mt-1.5 ${INPUT}`}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyExtraNominal(5000)}
                      className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-caption font-semibold text-text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      {t.extraAdmin}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExtraNominal(10000)}
                      className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-caption font-semibold text-text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      {t.extraFee}
                    </button>
                  </div>
                </div>
              </div>

              {/* Consumed By */}
              <div className="pt-3 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <label className={FIELD_LABEL}>{t.consumedBy}</label>
                  <button
                    type="button"
                    onClick={toggleAllConsumers}
                    className="text-caption font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {newConsumers.length === members.length ? t.clearSelection : t.allMembers}
                  </button>
                </div>
                <p className="text-caption text-text-muted mb-3">{t.consumedByHint}</p>

                <div className="flex flex-wrap gap-2">
                  {members.map((m, idx) => {
                    const isSelected = newConsumers.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleConsumer(m)}
                        className={choiceClass(isSelected)}
                      >
                        <MemberAvatar ageGroup="adult" variant={idx} className="size-6" />
                        <span>{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddExpense}
                  disabled={!newDesc.trim() || !newAmount || !effectivePayer}
                  className={`${PRIMARY_BUTTON} w-full shadow-md shadow-primary/20`}
                >
                  <Plus className="size-5" />
                  {editingId ? t.saveChanges : t.addExpense}
                </button>
              </div>
            </div>

            {/* List of expenses */}
            <div className="space-y-3 pt-2">
              <h3 className="font-heading text-h3 text-text">{t.recordedExpenses}</h3>

              {expenses.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {expenses.map((exp) => {
                    const payerIdx = members.indexOf(exp.paidBy);
                    const catDef = CATEGORIES.find((c) => c.key === exp.category) || CATEGORIES[5];
                    const CatIcon = catDef.icon;

                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <MemberAvatar
                            ageGroup="adult"
                            variant={payerIdx >= 0 ? payerIdx : 0}
                            className="size-11 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-label-lg font-bold text-text truncate">
                                {exp.description}
                              </p>
                              {exp.category && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-text-muted">
                                  <CatIcon className="size-3 text-primary" />
                                  <span>{t[catDef.labelKey]}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-primary-subtle text-primary">
                                {exp.paidBy}
                              </span>
                              <span className="text-caption text-text-muted">•</span>
                              <span className="font-heading text-caption font-bold text-text">
                                Rp {exp.amount.toLocaleString(numLocale)}
                              </span>
                              {exp.sharedBy &&
                                exp.sharedBy.length > 0 &&
                                exp.sharedBy.length < members.length && (
                                  <>
                                    <span className="text-caption text-text-muted">•</span>
                                    <span className="text-caption text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                                      {exp.sharedBy.length} {t.org}
                                    </span>
                                  </>
                                )}
                            </div>
                            {exp.notes && exp.notes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {exp.notes.map((n, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-muted text-text-muted"
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditExpense(exp)}
                            className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-primary transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-error-subtle hover:text-error transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-strong/40 p-8 text-center">
                  <ReceiptText className="mx-auto size-10 text-text-muted/40" />
                  <p className="mt-3 text-body-sm text-text-muted italic">{t.emptyExpenses}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStage("crew")}
              className={GHOST_BUTTON}
            >
              <ArrowLeft className="size-5" />
              {t.backToMembers}
            </button>
            <button
              type="button"
              disabled={expenses.length === 0}
              onClick={() => setStage("results")}
              className={`${PRIMARY_BUTTON} h-14 px-8 text-label-lg shadow-md shadow-primary/20`}
            >
              {t.nextToResults}
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: HASIL & PELUNASAN (RESULTS & SETTLEMENT) */}
      {stage === "results" && result && (
        <div className="space-y-8 motion-safe:animate-rise-in">
          {/* Header Title */}
          <div className="text-center">
            <h2 className="font-heading text-h1 text-text">{t.results}</h2>
            <p className="mt-2 text-body text-text-muted">{t.resultsSubtitle}</p>
          </div>

          {/* Centerpiece: Boarding Pass Receipt */}
          <div
            ref={receiptRef}
            className="drop-shadow-xl md:grid md:grid-cols-[minmax(0,1fr)_18rem]"
          >
            {/* Left Notch Pass */}
            <div className="ticket-notch notch-bottom rounded-t-3xl md:notch-right md:rounded-l-3xl md:rounded-tr-none overflow-clip bg-surface [--ticket-notch-size:0.75rem]">
              <div className="flex h-10 items-center justify-between bg-primary px-6 text-on-primary">
                <div className="flex items-center gap-2">
                  <ReceiptText className="size-4" aria-hidden="true" />
                  <p className="text-label tracking-wider">{t.receiptBrand}</p>
                </div>
                <span className="text-caption font-mono opacity-80">{formattedDate}</span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <span className="text-caption font-bold tracking-wider text-text-muted uppercase">
                      {t.totalExpense}
                    </span>
                    <p className="mt-2 font-heading text-display font-extrabold text-text">
                      Rp {result.totalExpense.toLocaleString(numLocale)}
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      {fillTemplate(t.expenseCount, { count: expenses.length })}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-primary/30 bg-primary-subtle p-5">
                    <span className="text-caption font-bold tracking-wider text-primary uppercase">
                      {t.perPerson}
                    </span>
                    <p className="mt-2 font-heading text-display font-extrabold text-primary">
                      Rp {Math.round(result.perPerson).toLocaleString(numLocale)}
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      {fillTemplate(t.memberCount, { count: members.length })}
                    </p>
                  </div>
                </div>

                {/* Categories Breakdown Chips in Receipt */}
                {categoryStats.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-caption font-bold tracking-wider text-text-muted uppercase mb-3">
                      {t.categorySummary}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {categoryStats.map((c) => {
                        const Icon = c.icon;
                        return (
                          <div
                            key={c.key}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="size-4 text-primary shrink-0" />
                              <span className="text-caption font-medium text-text truncate">{c.label}</span>
                            </div>
                            <span className="text-caption font-bold text-primary shrink-0 ml-1">
                              {c.percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manifest Summary */}
                <div className="border-t border-border pt-4">
                  <p className="text-caption font-bold tracking-wider text-text-muted uppercase mb-3">
                    {t.manifestCrew}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m, idx) => (
                      <div
                        key={m}
                        className="flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3 py-1 text-label text-text"
                      >
                        <MemberAvatar ageGroup="adult" variant={idx} className="size-7" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Notch Pass */}
            <div className="ticket-notch notch-top rounded-b-3xl border-t border-dashed border-border-strong md:flex md:flex-col md:notch-left md:rounded-r-3xl md:rounded-bl-none md:border-t-0 overflow-clip bg-surface [--ticket-notch-size:0.75rem]">
              <div aria-hidden="true" className="hidden h-10 bg-primary md:block" />
              <div className="flex flex-col justify-between gap-6 p-6 md:flex-1 md:border-l md:border-dashed md:border-border-strong">
                <div>
                  <span className="text-caption font-bold tracking-wider text-text-muted uppercase">
                    {t.settlementStatus}
                  </span>
                  <div className="mt-4 flex items-center justify-center py-2">
                    {result.settlements.length === 0 ? (
                      <Stamp label={t.receiptStamp} className="motion-safe:animate-stamp-in" />
                    ) : (
                      <div className="rounded-2xl bg-surface-muted border border-border px-4 py-3 text-center w-full">
                        <p className="font-heading text-h3 font-bold text-text">
                          {fillTemplate(t.transactionCount, { count: result.settlements.length })}
                        </p>
                        <p className="text-caption text-text-muted mt-1">{t.pendingSettlement}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="button"
                    onClick={handleDownloadPhoto}
                    disabled={downloading}
                    className={`${PRIMARY_BUTTON} w-full shadow-md shadow-primary/20`}
                  >
                    <Download className="size-4" />
                    {downloading ? t.downloadProcessing : t.downloadPhoto}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`${OUTLINE_BUTTON} w-full`}
                  >
                    {copied ? (
                      <>
                        <Check className="size-4 text-success" />
                        {t.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        {t.copySummary}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Transparan per Anggota */}
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-h2 text-text">{t.memberBreakdown}</h3>
                <p className="text-caption text-text-muted">{t.memberBreakdownDesc}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {memberBreakdowns.map((mb) => {
                const isExpanded = expandedMember === mb.name;
                return (
                  <div
                    key={mb.name}
                    className="rounded-2xl border border-border bg-background transition-colors overflow-hidden"
                  >
                    {/* Header Row */}
                    <button
                      type="button"
                      onClick={() => setExpandedMember(isExpanded ? null : mb.name)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 text-left hover:bg-surface-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          ageGroup="adult"
                          variant={mb.avatarIdx}
                          className="size-11 shrink-0"
                        />
                        <div>
                          <p className="font-heading text-h3 font-bold text-text">{mb.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-caption text-text-muted">
                              {t.totalShare}: <strong className="text-text">Rp {mb.totalShare.toLocaleString(numLocale)}</strong>
                            </span>
                            <span className="text-caption text-text-muted">•</span>
                            <span className="text-caption text-text-muted">
                              {t.totalPaid}: <strong className="text-text">Rp {mb.totalPaid.toLocaleString(numLocale)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {(() => {
                          const memberDebts = result?.settlements.filter((s) => s.from === mb.name) || [];
                          if (mb.netBalance < 0 && memberDebts.length > 0) {
                            const paidCount = memberDebts.filter(
                              (s) => !!confirmedSettlements[`${s.from}->${s.to}:${s.amount}`]
                            ).length;
                            const isFullyPaid = paidCount === memberDebts.length;

                            return (
                              <span
                                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold ${
                                  isFullyPaid
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-surface-muted text-text-muted border border-border"
                                }`}
                              >
                                {isFullyPaid ? (
                                  <>
                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                    <span>Lunas Terkonfirmasi</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="size-3.5" />
                                    <span>{paidCount}/{memberDebts.length} Terbayar</span>
                                  </>
                                )}
                              </span>
                            );
                          }
                          return null;
                        })()}

                        <div
                          className={`rounded-full px-3.5 py-1 text-label font-bold text-caption ${
                            mb.netBalance > 0
                              ? "bg-success-subtle text-success border border-success/30"
                              : mb.netBalance < 0
                              ? "bg-error-subtle text-error border border-error/30"
                              : "bg-surface-muted text-text-muted border border-border"
                          }`}
                        >
                          {mb.netBalance > 0
                            ? `${t.netReceive} Rp ${mb.netBalance.toLocaleString(numLocale)}`
                            : mb.netBalance < 0
                            ? `${t.netPay} Rp ${Math.abs(mb.netBalance).toLocaleString(numLocale)}`
                            : t.netEven}
                        </div>

                        <div className="size-8 rounded-full flex items-center justify-center text-text-muted bg-surface">
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </div>
                      </div>
                    </button>

                    {/* Expandable Item-by-item breakdown */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-border/60 bg-surface/40 space-y-2">
                        <p className="text-caption font-bold tracking-wider text-text-muted uppercase mb-3">
                          {t.viewDetail} ({mb.consumedItems.length})
                        </p>
                        {mb.consumedItems.length > 0 ? (
                          mb.consumedItems.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex items-center justify-between gap-4 p-3 rounded-xl bg-background border border-border/80 text-body-sm"
                            >
                              <div>
                                <p className="font-semibold text-text">{item.description}</p>
                                <p className="text-caption text-text-muted mt-0.5">
                                  {item.isPayer
                                    ? t.paidByYou
                                    : fillTemplate(t.paidByOther, { name: item.payer })}{" "}
                                  • {fillTemplate(t.portionOf, { count: item.consumerCount })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-heading font-bold text-text">
                                  Rp {item.myShare.toLocaleString(numLocale)}
                                </p>
                                <p className="text-[11px] text-text-muted">
                                  {fillTemplate(t.ofTotal, { total: item.totalAmount.toLocaleString(numLocale) })}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-caption text-text-muted italic">{t.noConsumedItems}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlements Route Cards (Penyelesaian Utang) */}
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-success-subtle text-success">
                <ArrowRight className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-h2 text-text">{t.settlements}</h3>
                <p className="text-caption text-text-muted">{t.settlementsDesc}</p>
              </div>
            </div>

            {/* Payment Confirmation Tracker */}
            {result.settlements.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-muted/60 p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-text text-body">
                        Status Konfirmasi Pembayaran
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold ${
                          settlementStats.isAllPaid
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {settlementStats.isAllPaid ? (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>Semua Lunas</span>
                          </>
                        ) : (
                          `${settlementStats.paidCount}/${settlementStats.totalCount} Terbayar`
                        )}
                      </span>
                    </div>
                    <p className="text-caption text-text-muted mt-0.5">
                      Rp {settlementStats.paidAmount.toLocaleString(numLocale)} dari Rp {settlementStats.totalAmount.toLocaleString(numLocale)} ({settlementStats.percentage}%) telah dikonfirmasi
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!settlementStats.isAllPaid ? (
                      <button
                        type="button"
                        onClick={handleMarkAllSettlementsPaid}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-caption font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="size-3.5" />
                        Tandai Semua Lunas
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetSettlementConfirmations}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-caption font-semibold rounded-xl border border-border bg-background text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset Status
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${settlementStats.percentage}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              {result.settlements.length > 0 ? (
                result.settlements.map((s, idx) => {
                  const fromIdx = members.indexOf(s.from);
                  const toIdx = members.indexOf(s.to);
                  const isItemCopied = copiedItem === idx;
                  const key = `${s.from}->${s.to}:${s.amount}`;
                  const isPaid = !!confirmedSettlements[key];

                  return (
                    <div
                      key={idx}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm transition-all ${
                        isPaid
                          ? "border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Debtor */}
                        <div
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-label font-bold ${
                            isPaid
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-error/20 bg-error-subtle text-error"
                          }`}
                        >
                          <MemberAvatar
                            ageGroup="adult"
                            variant={fromIdx >= 0 ? fromIdx : 0}
                            className="size-7"
                          />
                          <span className={isPaid ? "line-through opacity-80" : ""}>{s.from}</span>
                        </div>

                        {/* Route Line & Arrow */}
                        <div className="flex items-center gap-2 text-text-muted">
                          <span className="hidden h-px w-6 border-t border-dashed border-border-strong sm:block" />
                          <ArrowRight className="size-4 text-primary" />
                          <span className="text-caption font-semibold lowercase">{t.owes}</span>
                          <ArrowRight className="size-4 text-primary" />
                          <span className="hidden h-px w-6 border-t border-dashed border-border-strong sm:block" />
                        </div>

                        {/* Creditor */}
                        <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success-subtle px-3 py-1.5 text-label font-bold text-success">
                          <MemberAvatar
                            ageGroup="adult"
                            variant={toIdx >= 0 ? toIdx : 0}
                            className="size-7"
                          />
                          <span>{s.to}</span>
                        </div>

                        {/* Lunas Badge */}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="size-3.5" />
                            Lunas
                          </span>
                        )}
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                        <div
                          className={`rounded-xl border px-4 py-2 shadow-inner transition-colors ${
                            isPaid
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-border bg-surface"
                          }`}
                        >
                          <span
                            className={`font-heading text-h3 font-extrabold ${
                              isPaid
                                ? "text-emerald-600 dark:text-emerald-400 line-through opacity-80"
                                : "text-text"
                            }`}
                          >
                            Rp {s.amount.toLocaleString(numLocale)}
                          </span>
                        </div>

                        {/* Toggle Payment Confirmation Button */}
                        <button
                          type="button"
                          onClick={() => toggleSettlementConfirmed(key)}
                          title={isPaid ? "Klik untuk membatalkan konfirmasi bayar" : "Klik untuk konfirmasi bahwa uang sudah dibayar/diterima"}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption font-bold transition-all cursor-pointer ${
                            isPaid
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                              : "border border-border bg-surface hover:border-emerald-500/50 hover:bg-emerald-500/10 text-text-muted hover:text-emerald-600 dark:hover:text-emerald-400"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="size-4 text-white" />
                              <span>Sudah Bayar</span>
                            </>
                          ) : (
                            <>
                              <Circle className="size-4" />
                              <span>Konfirmasi Bayar</span>
                            </>
                          )}
                        </button>

                        {/* Copy Single Debt */}
                        <button
                          type="button"
                          onClick={() => handleCopySingleDebt(s, idx)}
                          title="Salin pesan tagihan"
                          className="flex size-10 items-center justify-center rounded-full border border-border text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer shrink-0"
                        >
                          {isItemCopied ? (
                            <Check className="size-4 text-success" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-success/30 bg-success-subtle p-8 text-center space-y-3">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/20 text-success">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h4 className="font-heading text-h3 font-bold text-success">{t.noDebts}</h4>
                  <p className="text-body-sm text-success/80 max-w-md mx-auto">{t.noDebtsMsg}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Action */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStage("expenses")}
              className={GHOST_BUTTON}
            >
              <ArrowLeft className="size-5" />
              {t.backToExpenses}
            </button>
            <button
              type="button"
              onClick={() => setStage("crew")}
              className={OUTLINE_BUTTON}
            >
              {t.changeMembers}
            </button>
          </div>
        </div>
      )}

      {/* Saved Members Picker Modal */}
      {isImportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-members-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsImportModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-border bg-surface text-text shadow-2xl overflow-hidden motion-safe:animate-message-in">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm shadow-primary/20">
                  <Users className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="import-members-title" className="font-heading text-h3 font-bold text-text">
                    {locale === "id" ? "Impor Anggota Tersimpan" : "Import Saved Members"}
                  </h2>
                  <p className="mt-0.5 text-caption text-text-muted">
                    {locale === "id"
                      ? "Pilih profil anggota keluarga atau rombongan dari riwayat perjalanan Anda."
                      : "Select family or group members from your saved profiles and trips."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                aria-label={locale === "id" ? "Tutup dialog" : "Close dialog"}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text active:scale-95"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {allAvailableProfiles.length === 0 ? (
                <div className="py-12 text-center text-text-muted">
                  <Users className="mx-auto size-12 opacity-30 mb-3" aria-hidden="true" />
                  <p className="text-body font-bold text-text">
                    {locale === "id"
                      ? "Belum ada profil anggota tersimpan."
                      : "No saved member profiles found."}
                  </p>
                  <p className="mt-1 text-caption text-text-muted max-w-sm mx-auto">
                    {locale === "id"
                      ? "Simpan profil rombongan atau anggota keluarga Anda agar dapat digunakan ulang di setiap perjalanan dan pembagian tagihan."
                      : "Save your group or family profiles to reuse them across all trips and bill splits."}
                  </p>
                  <a
                    href="/profile/saved-members"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-caption font-bold text-on-primary shadow-sm hover:bg-primary-hover"
                  >
                    <Plus className="size-4" />
                    {locale === "id" ? "Tambah Profil Baru" : "Add New Profile"}
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-caption font-bold text-text-muted">
                      {allAvailableProfiles.length} {locale === "id" ? "profil ditemukan" : "profiles found"}
                    </span>
                    {unaddedProfiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-caption font-bold text-primary hover:underline cursor-pointer"
                      >
                        {selectedImportIds.length === unaddedProfiles.length
                          ? (locale === "id" ? "Batalkan Semua" : "Deselect All")
                          : (locale === "id" ? "Pilih Semua yang Belum Ada" : "Select All Unadded")}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {allAvailableProfiles.map((p, idx) => {
                      const alreadyAdded = members.includes(p.name);
                      const isSelected = selectedImportIds.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!alreadyAdded) handleToggleSelectImport(p.id);
                          }}
                          className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                            alreadyAdded
                              ? "border-border/60 bg-surface-muted/50 opacity-60 cursor-default"
                              : isSelected
                                ? "border-primary bg-primary-subtle/40 ring-1 ring-primary/40 cursor-pointer shadow-sm"
                                : "border-border bg-surface hover:border-primary/40 hover:bg-surface-muted cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={alreadyAdded || isSelected}
                              disabled={alreadyAdded}
                              onChange={() => handleToggleSelectImport(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={p.name}
                              className="size-4.5 rounded border-border text-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                            <MemberAvatar
                              ageGroup={p.ageGroup || "adult"}
                              variant={idx}
                              className="size-11 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-heading text-body font-bold text-text truncate">
                                  {p.name}
                                </span>
                                {p.relationship && (
                                  <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                                    {p.relationship}
                                  </span>
                                )}
                              </div>
                              {p.notes && (
                                <p className="text-[11px] text-text-muted truncate mt-0.5">
                                  {p.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            {alreadyAdded ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-caption font-bold">
                                <Check className="size-3.5" />
                                {locale === "id" ? "Sudah di Tagihan" : "Added"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleImportSingle(p.name)}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-on-primary px-3 py-1 text-caption font-bold transition-colors cursor-pointer"
                              >
                                <Plus className="size-3.5" />
                                {locale === "id" ? "Tambah" : "Add"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
              <a
                href="/profile/saved-members"
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption font-semibold text-primary underline-offset-4 hover:underline"
              >
                {locale === "id" ? "Kelola profil di pengaturan akun →" : "Manage saved profiles in settings →"}
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-full border border-border px-4 py-2 text-caption font-bold text-text hover:bg-surface-muted cursor-pointer"
                >
                  {locale === "id" ? "Tutup" : "Close"}
                </button>
                {selectedImportIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmBatchImport}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover px-5 py-2 text-caption font-bold text-on-primary shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    {locale === "id"
                      ? `Tambahkan (${selectedImportIds.length}) Anggota`
                      : `Add (${selectedImportIds.length}) Members`}
                  </button>
                )}
              </div>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
