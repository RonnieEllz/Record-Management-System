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
  price?: number;
  created_at: string;
  updated_at?: string;
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
}): Promise<JobCard> => {
  const normalizedServiceId = payload.service_id?.trim() || FALLBACK_SERVICE_ID;

  const resolvedService = await resolveService(normalizedServiceId);

  const jobReference = `JC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  const cardInsertPayload: Record<string, unknown> = {
    job_reference: jobReference,
    customer_id: payload.customer_id,
    service_id: normalizedServiceId,
    customer_name: payload.customer_name,
    company_name: payload.company_name,
    phone_number: payload.phone_number,
    received_by: payload.received_by ?? null,
    notes: payload.notes ?? null,
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

export const updateJobCard = async (
  id: string,
  payload: Partial<Pick<JobCard, 'status' | 'notes' | 'assigned_to_id' | 'efd_receipt_num'>>,
) => {
  const { error } = await supabase.from('job_cards').update(payload).eq('id', id).select();

  if (error) {
    throw error;
  }
};
