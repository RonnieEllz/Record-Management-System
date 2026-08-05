import { supabase } from './supabase';

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address?: string;
  _count?: {
    jobCards: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export const fetchCustomers = async (query = ''): Promise<Customer[]> => {
  const baseRequest = supabase.from('customers').select('*').order('created_at', { ascending: false });

  // If no query provided return all customers
  if (!query) {
    const { data, error } = await baseRequest;
    if (error) throw error;

    return (data ?? []).map((customer: any) => ({
      ...customer,
      createdAt: customer.created_at ?? customer.createdAt,
      updatedAt: customer.updated_at ?? customer.updatedAt,
      _count: {
        jobCards: customer.job_cards_count ?? 0,
      },
    }));
  }

  // 1) Customers that match name/company/phone
  const { data: dataByFields, error: errFields } = await baseRequest.or(
    `name.ilike.%${query}%,company.ilike.%${query}%,phone.ilike.%${query}%`,
  );
  if (errFields) throw errFields;

  // 2) Find job cards whose job_reference matches the query and collect customer ids
  const { data: jobCards, error: jobErr } = await supabase
    .from('job_cards')
    .select('customer_id')
    .ilike('job_reference', `%${query}%`);

  if (jobErr) throw jobErr;

  let customersFromRefs: any[] = [];
  if (jobCards && jobCards.length > 0) {
    const ids = Array.from(new Set(jobCards.map((j: any) => j.customer_id))).filter(Boolean);
    if (ids.length > 0) {
      const { data: dataByIds, error: idsErr } = await supabase
        .from('customers')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (idsErr) throw idsErr;
      customersFromRefs = dataByIds ?? [];
    }
  }

  // Merge and dedupe customers from both sources (field match + reference match)
  const combined = [...(dataByFields ?? []), ...customersFromRefs];
  const uniqueMap: Record<string, any> = {};
  for (const c of combined) {
    uniqueMap[c.id] = c;
  }
  const finalData = Object.values(uniqueMap);

  return finalData.map((customer: any) => ({
    ...customer,
    createdAt: customer.created_at ?? customer.createdAt,
    updatedAt: customer.updated_at ?? customer.updatedAt,
    _count: {
      jobCards: customer.job_cards_count ?? 0,
    },
  }));
};

export const createCustomer = async (payload: Omit<Customer, 'id' | '_count' | 'createdAt'> & { address?: string }) => {
  const { error } = await supabase
    .from('customers')
    .insert([
      {
        ...payload,
        address: payload.address ?? '',
      },
    ])
    .select();

  if (error) {
    throw error;
  }
};

export const updateCustomer = async (
  id: string,
  payload: Omit<Customer, 'id' | '_count' | 'createdAt'> & { address?: string },
) => {
  const { error } = await supabase
    .from('customers')
    .update({
      ...payload,
      address: payload.address ?? '',
    })
    .eq('id', id)
    .select();

  if (error) {
    throw error;
  }
};

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);

  if (error) {
    throw error;
  }
};
