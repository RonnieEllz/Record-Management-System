import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer, type Customer } from '../lib/customers';
import {
  createJobCard,
  fetchJobCards,
  fetchJobCardsByCustomer,
  fetchServices,
  fetchTodayBatch,
  type JobCard,
  type ServiceOption,
  type TransactionBatch,
} from '../lib/jobCards';
import { getNetworkErrorMessage } from '../lib/supabase';
import { canCreateCustomers, canCreateJobCards, canDeleteCustomers, canUpdateCustomers } from '../lib/rbac';
import { formatDate } from '../lib/dateUtils';
import {
  Search,
  UserPlus,
  Building2,
  Phone,
  Mail,
  FileText,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
} from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { getStatusBadgeClass, getStatusLabel } from '../lib/status';

export const CustomerDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [latestJobCardsByCustomer, setLatestJobCardsByCustomer] = useState<Record<string, JobCard>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateJobCardModalOpen, setIsCreateJobCardModalOpen] = useState(false);
  const [isCreateJobCardConfirmOpen, setIsCreateJobCardConfirmOpen] = useState(false);
  const [isCustomerDetailsModalOpen, setIsCustomerDetailsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [jobCountsByCustomer, setJobCountsByCustomer] = useState<Record<string, number>>({});
  const [jobTotalsByCustomer, setJobTotalsByCustomer] = useState<Record<string, number>>({});
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [jobCardNotes, setJobCardNotes] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [todayBatch, setTodayBatch] = useState<TransactionBatch | null>(null);
  const [isCheckingTodayBatch, setIsCheckingTodayBatch] = useState(true);
  const [jobCardPrice, setJobCardPrice] = useState('');
  const [hasTouchedJobCardFields, setHasTouchedJobCardFields] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce logic for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadCustomers = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const normalizedCustomers = await fetchCustomers(query);
      const allJobCards = await fetchJobCards();
      const latestJobCardByCustomer: Record<string, JobCard> = {};
      const countsByCustomer: Record<string, number> = {};
      const totalsByCustomer: Record<string, number> = {};

      for (const jobCard of allJobCards) {
        const customerId = jobCard.customer_id as string;
        const currentLatest = latestJobCardByCustomer[customerId];
        if (!currentLatest || new Date(jobCard.created_at) > new Date(currentLatest.created_at)) {
          latestJobCardByCustomer[customerId] = jobCard;
        }
        countsByCustomer[customerId] = (countsByCustomer[customerId] ?? 0) + 1;
        totalsByCustomer[customerId] = (totalsByCustomer[customerId] ?? 0) + Number(jobCard.price ?? 0);
      }

      setCustomers(normalizedCustomers);
      setLatestJobCardsByCustomer(latestJobCardByCustomer);
      setJobCountsByCustomer(countsByCustomer);
      setJobTotalsByCustomer(totalsByCustomer);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Failed to load customers list'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers(debouncedSearch);
  }, [debouncedSearch, loadCustomers]);

  const loadTodayBatch = useCallback(async () => {
    setIsCheckingTodayBatch(true);
    try {
      const batch = await fetchTodayBatch();
      setTodayBatch(batch);
    } catch (err: any) {
      console.warn('Unable to refresh today batch status', err);
    } finally {
      setIsCheckingTodayBatch(false);
    }
  }, []);

  useEffect(() => {
    loadTodayBatch();
  }, [loadTodayBatch]);

  // use shared status helpers from lib/status.ts

  const resetForm = () => {
    setFormData({ name: '', company: '', phone: '', email: '' });
    setFormErrors(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
    });
    setFormErrors(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleOpenCustomerDetailsModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setIsCustomerDetailsModalOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
  };

  const handleOpenCreateJobCardModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setJobCardNotes('');
    setSelectedServiceId('');
    setJobCardPrice('');
    setHasTouchedJobCardFields(false);
    setFormErrors(null);
    setServices([]);

    try {
      const batch = await fetchTodayBatch();
      setTodayBatch(batch);
      if (!batch) {
        setFormErrors(
          "Today's transaction batch is not open. Open today's batch in Jobs Queue before creating a new job.",
        );
        return;
      }
      if (batch.status === 'CLOSED') {
        setFormErrors(
          "Today's transaction batch is closed. Reopen the batch or wait until tomorrow before creating a new job.",
        );
        return;
      }

      const fetchedServices = await fetchServices();
      setServices(fetchedServices);
      if (fetchedServices[0]) {
        setSelectedServiceId(fetchedServices[0].id);
        setJobCardPrice(fetchedServices[0].price.toString());
      }
    } catch (err: any) {
      setServices([
        {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'General Inspection',
          description: 'Default inspection service',
          price: 0,
        },
      ]);
      setSelectedServiceId('00000000-0000-0000-0000-000000000000');
      setJobCardPrice('0');
      setError(getNetworkErrorMessage(err, 'Unable to load job services, continuing with a fallback service.'));
      return;
    }

    setIsCreateJobCardModalOpen(true);
  };

  const isCreateJobCardValid = (): boolean => {
    const priceText = jobCardPrice.trim();
    const priceValue = Number(priceText);
    const hasPrice = priceText.length > 0 && Number.isFinite(priceValue) && priceValue > 0;
    const hasDescription = jobCardNotes.trim().length > 0;

    return hasPrice && hasDescription;
  };

  const handleCreateJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!isCreateJobCardValid()) {
      setFormErrors('Please provide both price and description before continuing.');
      return;
    }

    setFormErrors(null);
    setIsCreateJobCardConfirmOpen(true);
  };

  const handleConfirmCreateJobCard = async () => {
    if (!selectedCustomer) return;

    if (!isCreateJobCardValid()) {
      setFormErrors('Please provide both price and description before continuing.');
      setIsCreateJobCardConfirmOpen(false);
      return;
    }

    const normalizedServiceId = selectedServiceId.trim() || '00000000-0000-0000-0000-000000000000';
    const priceValue = Number(jobCardPrice);

    setFormErrors(null);
    setIsSubmitting(true);
    setIsCreateJobCardConfirmOpen(false);

    try {
      await createJobCard({
        customer_id: selectedCustomer.id,
        service_id: normalizedServiceId,
        customer_name: selectedCustomer.name,
        company_name: selectedCustomer.company,
        phone_number: selectedCustomer.phone,
        received_by: user?.id ?? null,
        notes: jobCardNotes.trim() || null,
        price: Number.isFinite(priceValue) ? priceValue : 0,
      });

      setIsCreateJobCardModalOpen(false);
      setSelectedCustomer(null);
      setSelectedServiceId('');
      setJobCardNotes('');
      setSuccessMessage(`Job card created for ${selectedCustomer.name}.`);
      loadCustomers(debouncedSearch);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrors(getNetworkErrorMessage(err, 'Unable to create job card.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors(null);
    setIsSubmitting(true);

    try {
      await createCustomer(formData);

      setIsCreateModalOpen(false);
      resetForm();
      setSuccessMessage(`Customer '${formData.name}' registered successfully.`);
      loadCustomers(debouncedSearch);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrors(getNetworkErrorMessage(err, 'Error registering customer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormErrors(null);
    setIsSubmitting(true);

    try {
      await updateCustomer(selectedCustomer.id, formData);

      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      resetForm();
      setSuccessMessage(`Customer '${formData.name}' updated successfully.`);
      loadCustomers(debouncedSearch);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrors(getNetworkErrorMessage(err, 'Error updating customer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);

    try {
      const existingJobCards = await fetchJobCardsByCustomer(selectedCustomer.id);
      if (existingJobCards.length > 0) {
        setError(
          `Cannot delete '${selectedCustomer.name}' because ${existingJobCards.length} job card(s) are linked to this customer. Remove or reassign those jobs first.`,
        );
        return;
      }

      await deleteCustomer(selectedCustomer.id);

      setIsDeleteModalOpen(false);
      setSuccessMessage(`Customer '${selectedCustomer.name}' deleted successfully.`);
      setSelectedCustomer(null);
      loadCustomers(debouncedSearch);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      const normalizedError = String((err?.message ?? err) || '').toLowerCase();
      if (normalizedError.includes('job_cards_customer_id_fkey') || normalizedError.includes('violates foreign key constraint')) {
        setError(
          `Cannot delete '${selectedCustomer.name}' because there are job cards linked to this customer. Remove or reassign those jobs first.`,
        );
      } else {
        setError(getNetworkErrorMessage(err, 'Error deleting customer'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateCustomer = canCreateCustomers(user?.role);
  const canUpdateCustomer = canUpdateCustomers(user?.role);
  const canDeleteCustomer = canDeleteCustomers(user?.role);
  const canCreateJobCardsForCustomer = canCreateJobCards(user?.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Contact Directory</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Contact management workspace
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateCustomer && (
            <button
              id="register-contact-btn"
              onClick={handleOpenCreateModal}
              className="glass-button self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Contact</span>
            </button>
          )}

          {canUpdateCustomer && (
            <button
              type="button"
              onClick={() => selectedCustomer && handleOpenEditModal(selectedCustomer)}
              disabled={!selectedCustomer}
              title={selectedCustomer ? 'Edit selected contact' : 'Select a contact first'}
              className="glass-button self-start sm:self-auto rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {canDeleteCustomer && (
            <button
              type="button"
              onClick={() => selectedCustomer && handleOpenDeleteModal(selectedCustomer)}
              disabled={!selectedCustomer}
              title={selectedCustomer ? 'Delete selected contact' : 'Select a contact first'}
              className="glass-button self-start sm:self-auto rounded-full p-2 bg-rose-600/10 text-rose-300 border border-rose-600/20 hover:bg-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Instant Search Bar */}
      <div className="glass-panel p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchInput
              id="customer-search-input"
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder="Search by name, company, phone, or job reference"
              ariaLabel="Search contacts"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-medium px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-lg sm:justify-start">
          <span>Total Records:</span>
          <span className="text-indigo-400 font-bold">{customers.length}</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Fetching customer records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No contact records found</p>
            <p className="text-sm text-slate-500">
              {debouncedSearch
                ? `No matches found for search query '${debouncedSearch}'.`
                : 'Get started by registering a new contact record.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain">
            <table className="w-full min-w-[780px] text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Contact Name</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Date In</th>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Price</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className={`transition-colors cursor-pointer ${selectedCustomerId === c.id ? 'bg-slate-800/60 text-white' : 'hover:bg-slate-800/40'}`}
                    onClick={() => handleSelectCustomer(c)}
                    onDoubleClick={() => handleOpenCustomerDetailsModal(c)}
                  >
                    <td className="px-6 py-4 max-w-[240px]">
                      <div className="font-semibold text-slate-100 flex items-center gap-2 truncate">
                        {c.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1 min-w-[140px]">
                      <div className={`text-xs ${selectedCustomerId === c.id ? 'text-white' : 'text-slate-300'} flex items-center gap-1.5 font-mono`}>
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <div className={`${selectedCustomerId === c.id ? 'text-white' : 'text-slate-400'} text-xs`}>{formatDate(c.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 min-w-[180px]">
                      {latestJobCardsByCustomer[c.id] ? (
                        <div className={`font-semibold truncate ${selectedCustomerId === c.id ? 'text-white' : 'text-slate-100'}`}>{latestJobCardsByCustomer[c.id].job_reference}</div>
                      ) : (
                        <div className={`text-sm ${selectedCustomerId === c.id ? 'text-white' : 'text-slate-400'}`}>—</div>
                      )}
                    </td>
                    <td className="px-6 py-4 min-w-[150px]">
                      {latestJobCardsByCustomer[c.id] ? (
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(latestJobCardsByCustomer[c.id].status)} whitespace-nowrap`}>
                          <FileText className="w-3 h-3" />
                          {getStatusLabel(latestJobCardsByCustomer[c.id].status)}
                        </div>
                      ) : (
                        <div className={`text-sm ${selectedCustomerId === c.id ? 'text-white' : 'text-slate-400'} whitespace-nowrap`}>No active job card</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-100">
                      {jobTotalsByCustomer[c.id] != null
                        ? `K${jobTotalsByCustomer[c.id].toFixed(2)}`
                        : 'K0.00'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canCreateJobCardsForCustomer && todayBatch?.status === 'CLOSED' ? (
                        <button
                          type="button"
                          disabled
                          title="Today's batch is closed"
                          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 text-xs font-semibold cursor-not-allowed"
                        >
                          Batch Closed
                        </button>
                      ) : canCreateJobCardsForCustomer ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCreateJobCardModal(c)}
                          className="px-3 py-2 rounded-lg bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-400 text-xs font-semibold"
                        >
                          Create Job Card
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      <Modal
        isOpen={isCustomerDetailsModalOpen}
        onClose={() => setIsCustomerDetailsModalOpen(false)}
        title="Contact Details"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300 space-y-2">
            <div className="font-semibold text-white">{selectedCustomer?.name}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedCustomer?.phone}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedCustomer?.company}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedCustomer?.email}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Job Card</div>
            {selectedCustomer?.id && latestJobCardsByCustomer[selectedCustomer.id] ? (
              <>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">Jobs:</span>
                  <span>{jobCountsByCustomer[selectedCustomer.id] ?? 0}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">Reference:</span>
                  <span>{latestJobCardsByCustomer[selectedCustomer.id].job_reference}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">Status:</span>
                  <span>{getStatusLabel(latestJobCardsByCustomer[selectedCustomer.id].status)}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">Date In:</span>
                  <span>{formatDate(latestJobCardsByCustomer[selectedCustomer.id].created_at)}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">No job card is available for this customer yet.</div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCustomerDetailsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Contact"
      >
        {formErrors && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formErrors}</span>
          </div>
        )}

        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Contact Full Name</label>
            <input
              id="create-name-input"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="glass-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Company / Business Name</label>
            <input
              id="create-company-input"
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g. Apex Logistics Ltd"
              className="glass-input w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number (Unique)</label>
              <input
                id="create-phone-input"
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+260 97 0000000"
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Email Address</label>
              <input
                id="create-email-input"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@company.com"
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-customer-btn"
              type="submit"
              disabled={isSubmitting}
              className="glass-button text-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Contact Profile"
      >
        {formErrors && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formErrors}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Contact Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Company / Business Name</label>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="glass-input w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button text-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Job Card Modal */}
      <Modal
        isOpen={isCreateJobCardModalOpen}
        onClose={() => setIsCreateJobCardModalOpen(false)}
        title="Create Job Card"
      >
        {formErrors && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formErrors}</span>
          </div>
        )}

        <form onSubmit={handleCreateJobCard} className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300 space-y-1">
            <div className="font-semibold text-white">{selectedCustomer?.name}</div>
            <div className="text-xs text-slate-400">{selectedCustomer?.company}</div>
            <div className="text-xs text-slate-400">{selectedCustomer?.phone}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Price</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={jobCardPrice}
              onChange={(e) => {
                setJobCardPrice(e.target.value);
                setHasTouchedJobCardFields(true);
              }}
              placeholder="Enter the job price"
              className="glass-input w-full"
            />
            {hasTouchedJobCardFields && (jobCardPrice.trim().length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Price is required.</p>
            ) : Number(jobCardPrice) <= 0 ? (
              <p className="mt-2 text-xs text-slate-500">Price must be greater than zero.</p>
            ) : null)}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={jobCardNotes}
              onChange={(e) => {
                setJobCardNotes(e.target.value);
                setHasTouchedJobCardFields(true);
              }}
              placeholder="Describe the job or intake details"
              className="glass-input w-full resize-none"
            />
            {hasTouchedJobCardFields && jobCardNotes.trim().length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Description is required.</p>
            )}
          </div>

          <div className="sticky bottom-0 left-0 right-0 z-20 glass-panel border-t border-slate-800 py-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateJobCardModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isCreateJobCardValid()}
              className="glass-button text-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Job Card'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateJobCardConfirmOpen}
        onClose={() => setIsCreateJobCardConfirmOpen(false)}
        title="Confirm Job Card Creation"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Create a new job card for <strong className="text-white">{selectedCustomer?.name}</strong>?
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p>
              <span className="font-semibold text-slate-200">Service:</span>{' '}
              {services.find((service) => service.id === selectedServiceId)?.name || 'Selected service'}
            </p>
            <p>
              <span className="font-semibold text-slate-200">Price:</span>{' '}
              {Number(jobCardPrice) || 0}
            </p>
            <p>
              <span className="font-semibold text-slate-200">Description:</span>{' '}
              {jobCardNotes || 'No description provided.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateJobCardConfirmOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCreateJobCard}
              disabled={isSubmitting}
              className="glass-button text-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Contact Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete contact record{' '}
            <strong className="text-white">{selectedCustomer?.name}</strong> ({selectedCustomer?.company})?
            This operation cannot be undone.
          </p>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-delete-customer-btn"
              onClick={handleDeleteCustomer}
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Contact'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
