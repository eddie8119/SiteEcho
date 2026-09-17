import { CompanyDTO, CompanyFromDB } from '@/types/company';

export function toCompanyDTO(db: CompanyFromDB): CompanyDTO {
  return {
    id: db.id,
    name: db.name,
    address: db.address,
    contactPerson: db.contact_person,
    email: db.email,
    phone: db.phone,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
