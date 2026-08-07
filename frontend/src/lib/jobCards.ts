import { supabase } from './supabase';

export type JobCardStatus =
  | 'RECEIVED'
  | 'WAITING_FOR_INSPECTION'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_COLLECTION'
  | 'COLLECTED';

export interface JobCard {
  id: string;
  customer_id: string | null;
  job_reference: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  status: JobCardStatus;
  notes: string | null;
  assigned_to_id: string | null;
  efd_receipt_num: string | null;
  batch_id?: string | null;
  batch_date?: string | null;
  price?: number;
  created_at: string;
  updated_at?: string;
}

export interface TransactionBatch {
  id: string;
  batch_date: string;
  status: 'OPEN' | 'CLOSED';
  created_by: string | null;
  closed_by: string | null;
  reopened_by?: string | null;
  created_at: string;
  closed_at?: string | null;
  reopened_at?: string | null;
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

const FALLBACK_SERVICE_ID = '00000000-0000-0000-0000-000000000000';
const FALLBACK_SERVICE_NAME = 'General Inspection';

const fallbackServiceOption: ServiceOption = {
  id: FALLBACK_SERVICE_ID,
  name: FALLBACK_SERVICE_NAME,
  description: 'Default inspection service',
  price: 0,
};

const todayDateString = (): string => new Date().toISOString().slice(0, 10);

export const fetchTodayBatch = async (): Promise<TransactionBatch | null> => {
  const { data, error } = await supabase
    .from('transaction_batches')
    .select('*')
    .eq('batch_date', todayDateString())
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data ?? null;
};

export const createTransactionBatch = async (createdBy?: string | null): Promise<TransactionBatch> => {
  const { data, error } = await supabase
    .from('transaction_batches')
    .insert([
      {
        batch_date: todayDateString(),
        created_by: createdBy ?? null,
        status: 'OPEN',
      },
    ])
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create today's transaction batch.");
  }

  return data;
};

export const fetchOrCreateTodayBatch = async (createdBy?: string | null): Promise<TransactionBatch> => {
  const existingBatch = await fetchTodayBatch();
  if (existingBatch) {
    return existingBatch;
  }
  return createTransactionBatch(createdBy);
};

export const fetchAllBatches = async (): Promise<TransactionBatch[]> => {
  const { data, error } = await supabase
    .from('transaction_batches')
    .select('*')
    .order('batch_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TransactionBatch[];
};

export const closeTransactionBatch = async (batchId: string, closedBy?: string | null): Promise<void> => {
  const { error } = await supabase
    .from('transaction_batches')
    .update({ status: 'CLOSED', closed_by: closedBy ?? null, closed_at: new Date().toISOString() })
    .eq('id', batchId);

  if (error) {
    throw error;
  }
};

export const reopenTransactionBatch = async (batchId: string, reopenedBy?: string | null): Promise<void> => {
  const { error } = await supabase
    .from('transaction_batches')
    .update({ status: 'OPEN', reopened_by: reopenedBy ?? null, reopened_at: new Date().toISOString() })
    .eq('id', batchId);

  if (error) {
    throw error;
  }
};

export const fetchJobCardsForCurrentMonth = async (): Promise<JobCard[]> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from('job_cards')
    .select('*, job_services (price)')
    .gte('created_at', monthStart)
    .lt('created_at', nextMonthStart)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((jobCard: any) => mapJobCard(jobCard));
};

export const fetchJobCardsForBatch = async (batchId: string): Promise<JobCard[]> => {
  const { data, error } = await supabase
    .from('job_cards')
    .select('*, job_services (price)')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((jobCard: any) => mapJobCard(jobCard));
};

const mapJobCard = (jobCard: any): JobCard => ({
  ...jobCard,
  customer_id: jobCard.customer_id ?? null,
  status: jobCard.status ?? 'RECEIVED',
  notes: jobCard.notes ?? null,
  assigned_to_id: jobCard.assigned_to_id ?? null,
  efd_receipt_num: jobCard.efd_receipt_num ?? null,
  price: Number(
    jobCard.price ??
      (Array.isArray(jobCard.job_services)
        ? jobCard.job_services.reduce((sum: number, service: any) => sum + Number(service.price ?? 0), 0)
        : 0),
  ),
});

const resolveService = async (serviceId?: string): Promise<{ id: string; name: string; price: number } | null> => {
  const normalizedServiceId = serviceId?.trim();

  if (!normalizedServiceId) {
    return null;
  }

  const { data: serviceRow, error: serviceError } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('id', normalizedServiceId)
    .eq('active', true)
    .maybeSingle();

  if (serviceError && serviceError.code !== 'PGRST116') {
    return null;
  }

  if (!serviceRow?.id) {
    return null;
  }

  return {
    id: serviceRow.id,
    name: serviceRow.name,
    price: Number(serviceRow.price ?? 0),
  };
};

export const fetchServices = async (): Promise<ServiceOption[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, price')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const availableServices = (data ?? []).map((service: any) => ({
    id: service.id,
    name: service.name,
    description: service.description ?? null,
    price: Number(service.price ?? 0),
  }));

  if (availableServices.length === 0) {
    return [fallbackServiceOption];
  }

  return availableServices;
};

export const createJobCard = async (payload: {
  customer_id: string;
  service_id: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  received_by?: string | null;
  notes?: string | null;
  price?: number | null;
  batch_id?: string | null;
}): Promise<JobCard> => {
  const normalizedServiceId = payload.service_id?.trim() || FALLBACK_SERVICE_ID;

  const resolvedService = await resolveService(normalizedServiceId);

  const jobReference = `JC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  const todayBatch = await fetchTodayBatch();

  if (!todayBatch) {
    throw new Error(
      "Today's transaction batch is not open. Open today's batch in Jobs Queue before creating new job cards.",
    );
  }

  if (todayBatch.status === 'CLOSED') {
    throw new Error("Today's transaction batch is closed. Reopen it before creating new job cards.");
  }

  const resolvedBatch = todayBatch;

  const cardInsertPayload: Record<string, unknown> = {
    job_reference: jobReference,
    customer_id: payload.customer_id,
    service_id: normalizedServiceId,
    customer_name: payload.customer_name,
    company_name: payload.company_name,
    phone_number: payload.phone_number,
    received_by: payload.received_by ?? null,
    notes: payload.notes ?? null,
    batch_id: payload.batch_id ?? resolvedBatch.id,
    status: 'RECEIVED',
  };

  const { data: createdCard, error: createCardError } = await supabase
    .from('job_cards')
    .insert([cardInsertPayload])
    .select('*')
    .single();

  if (createCardError || !createdCard) {
    throw createCardError ?? new Error('Unable to create a job card for this customer.');
  }

  {
    const priceToUse = Number(payload.price ?? resolvedService?.price ?? 0);
    const jobServicePayload = {
      job_card_id: createdCard.id,
      service_id: resolvedService?.id ?? normalizedServiceId,
      quantity: 1,
      price: priceToUse,
    };

    const { error: jobServiceError } = await supabase.from('job_services').insert([jobServicePayload]);

    if (jobServiceError) {
      console.warn('Job service row could not be attached, but the card was created.', jobServiceError);
    }
  }

  return mapJobCard(createdCard);
};

export const fetchJobCards = async (): Promise<JobCard[]> => {
  const { data, error } = await supabase
    .from('job_cards')
    .select('*, job_services (price)')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((jobCard: any) => mapJobCard(jobCard));
};

export const fetchJobCardsByCustomer = async (customerId: string): Promise<JobCard[]> => {
  const { data, error } = await supabase
    .from('job_cards')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((jobCard: any) => mapJobCard(jobCard));
};

export const updateJobCard = async (
  id: string,
  payload: Partial<Pick<JobCard, 'status' | 'notes' | 'assigned_to_id' | 'efd_receipt_num'>>,
) => {
  const { error } = await supabase.from('job_cards').update(payload).eq('id', id).select();

  if (error) {
    throw error;
  }
};

export const deleteJobCard = async (id: string) => {
  const { error: serviceError } = await supabase.from('job_services').delete().eq('job_card_id', id);
  if (serviceError) {
    console.warn('Unable to remove linked job services before deleting job card.', serviceError);
  }

  const { error } = await supabase.from('job_cards').delete().eq('id', id);
  if (error) {
    throw error;
  }
};
