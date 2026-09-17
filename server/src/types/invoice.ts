import { CompanyFromDB } from './company';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceItemInsert {
  user_id: string;
  invoice_id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface BaseInvoiceFromDB {
  id: string;
  invoice_number: string;
  due_date: string; // Comes from DB, will be formatted
  total_amount: number;
  currency: string | null;
  status: string;
  note: string | null;
  created_at: string;
  type: 'receivable' | 'payable';
}

export interface InvoiceForList extends BaseInvoiceFromDB {
  company: { id: string; name: string } | null;
}

export interface InvoiceDetail extends BaseInvoiceFromDB {
  company: CompanyFromDB | null;
  items: InvoiceItem[];
}
