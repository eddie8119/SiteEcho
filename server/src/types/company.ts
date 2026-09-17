export interface CompanyFromDB {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

export interface CompanyDTO {
  id: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt?: string | null;
}
