import { Car, Ellipsis, Hotel, type LucideIcon, ShoppingBag, Ticket, Utensils } from "lucide-react";
import type { ExpenseCategory } from "@/lib/split-bill/bill";

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  transport: Car,
  lodging: Hotel,
  activity: Ticket,
  shopping: ShoppingBag,
  other: Ellipsis,
};
