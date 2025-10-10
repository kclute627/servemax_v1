import { serverTimestamp } from 'firebase/firestore';

// Utility functions for realistic data generation
const getRandomDate = (daysAgo, daysRange = 30) => {
  const today = new Date();
  const startDate = new Date(today.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const endDate = new Date(startDate.getTime() + (daysRange * 24 * 60 * 60 * 1000));
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
};

const getRandomPhone = () => {
  return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
};

const getRandomAmount = (min = 50, max = 300) => {
  return Math.floor(Math.random() * (max - min) + min);
};

// Company dummy data (your main company)
export const dummyCompany = {
  id: 'company_12345',
  company_name: 'Metropolitan Process Services LLC',
  name: 'Metropolitan Process Services LLC', // Keep both for compatibility
  email: 'contact@metropolitanprocess.com',
  phone: '(555) 123-4567',
  website: 'https://metropolitanprocess.com',
  fax: '(555) 123-4568',

  // Legacy address fields
  address: '1234 Business Center Drive, Suite 200',
  city: 'Dallas',
  state: 'TX',
  zip: '75201',
  county: 'Dallas County',

  // Enhanced address system
  addresses: [
    {
      label: "Primary Office",
      address1: '1234 Business Center Drive',
      address2: 'Suite 200',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75201',
      county: 'Dallas County',
      lat: 32.7767,
      lng: -96.7970,
      primary: true,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15')
    }
  ],

  // Ownership & relationships
  owner_id: 'user_owner_123',
  company_owner: 'user_owner_123',
  company_employees: ['user_employee_1', 'user_employee_2', 'user_employee_3'],

  // Business classification
  company_type: 'process_serving',
  staff_size: 'small_team',
  service_capabilities: ['standard_service', 'rush_service', 'weekend_service', 'court_filing'],
  custom_job_statuses: ['pending_review', 'ready_for_service'],

  // Business analytics
  monthly_jobs_quota: 500,
  current_month_job_count: 127,
  pending_jobs_count: 23,
  first_job_created_at: new Date('2024-01-20'),
  last_job_created_at: new Date(),

  // Financial capabilities
  can_receive_funds: true,

  // Billing & subscription
  billing_tier: 'paid',
  subscription_status: 'active',
  trial_start_date: new Date('2024-01-15'),
  trial_jobs_used: 0,
  stripe_customer_id: 'cus_stripe123',
  stripe_subscription_id: 'sub_stripe123',
  plan_name: 'professional',
  monthly_job_limit: 1000,

  // Collaboration settings
  collaboration_settings: {
    job_sharing_enabled: true,
    directory_listing_enabled: true,
    accepts_overflow_work: true
  },

  // Invoice settings
  invoice_settings: {
    invoice_for_printing: false,
    per_page_copy_rate: 0.25,
    tax_on_invoice: false,
    tax_rate: 0,
    service_fee: 75,
    rush_fee: 50,
    emergency_fee: 150,
    invoice_presets: [
      { id: 'preset_1', description: 'Mileage Fee', default_amount: 15.00 },
      { id: 'preset_2', description: 'Additional Attempt', default_amount: 25.00 },
      { id: 'preset_3', description: 'Research Fee', default_amount: 35.00 },
      { id: 'preset_4', description: 'Filing Fee', default_amount: 50.00 }
    ]
  },

  created_at: new Date('2024-01-15'),
  updated_at: new Date()
};

// Dummy clients
export const dummyClients = [
  {
    id: 'client_1',
    company_id: 'company_12345',
    company_name: 'Anderson & Associates Law Firm',
    email: 'service@andersonlaw.com',
    phone: '(555) 234-5678',
    address: '789 Legal Plaza',
    city: 'Dallas',
    state: 'TX',
    zip: '75202',
    contact_person: 'Sarah Anderson',
    client_type: 'law_firm',
    billing_address: '789 Legal Plaza, Dallas, TX 75202',
    payment_terms: 'net_30',
    is_active: true,
    total_jobs: 45,
    total_billed: 13500,
    total_paid: 12800,
    created_at: new Date('2024-02-01'),
    updated_at: new Date()
  },
  {
    id: 'client_2',
    company_id: 'company_12345',
    company_name: 'First National Bank',
    email: 'legal@firstnational.com',
    phone: '(555) 345-6789',
    address: '456 Finance Street',
    city: 'Dallas',
    state: 'TX',
    zip: '75203',
    contact_person: 'Michael Rodriguez',
    client_type: 'financial_institution',
    billing_address: '456 Finance Street, Dallas, TX 75203',
    payment_terms: 'net_15',
    is_active: true,
    total_jobs: 67,
    total_billed: 20100,
    total_paid: 20100,
    created_at: new Date('2024-01-20'),
    updated_at: new Date()
  },
  {
    id: 'client_3',
    company_id: 'company_12345',
    company_name: 'Metro Property Management',
    email: 'admin@metroprop.com',
    phone: '(555) 456-7890',
    address: '321 Real Estate Blvd',
    city: 'Dallas',
    state: 'TX',
    zip: '75204',
    contact_person: 'Jennifer Chen',
    client_type: 'property_management',
    billing_address: '321 Real Estate Blvd, Dallas, TX 75204',
    payment_terms: 'net_30',
    is_active: true,
    total_jobs: 89,
    total_billed: 26700,
    total_paid: 24300,
    created_at: new Date('2024-01-25'),
    updated_at: new Date()
  },
  {
    id: 'client_4',
    company_id: 'company_12345',
    company_name: 'Texas Municipal Court',
    email: 'clerk@texascourt.gov',
    phone: '(555) 567-8901',
    address: '100 Court House Square',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    contact_person: 'Robert Johnson',
    client_type: 'government',
    billing_address: '100 Court House Square, Dallas, TX 75201',
    payment_terms: 'net_45',
    is_active: true,
    total_jobs: 34,
    total_billed: 10200,
    total_paid: 8500,
    created_at: new Date('2024-02-10'),
    updated_at: new Date()
  },
  {
    id: 'client_5',
    company_id: 'company_12345',
    company_name: 'Corporate Collections Inc',
    email: 'processing@corpcollections.com',
    phone: '(555) 678-9012',
    address: '555 Commerce Way',
    city: 'Dallas',
    state: 'TX',
    zip: '75205',
    contact_person: 'Amanda Williams',
    client_type: 'collection_agency',
    billing_address: '555 Commerce Way, Dallas, TX 75205',
    payment_terms: 'net_30',
    is_active: true,
    total_jobs: 123,
    total_billed: 36900,
    total_paid: 35200,
    created_at: new Date('2024-01-18'),
    updated_at: new Date()
  }
];

// Dummy employees (process servers and admin staff)
export const dummyEmployees = [
  {
    id: 'user_employee_1',
    company_id: 'company_12345',
    email: 'marcus.thompson@metropolitanprocess.com',
    first_name: 'Marcus',
    last_name: 'Thompson',
    full_name: 'Marcus Thompson',
    role: 'process_server',
    phone: '(555) 111-2222',
    address: '123 Server Lane, Dallas, TX 75206',
    is_active: true,
    hire_date: new Date('2024-02-01'),
    pay_rate: 45.00,
    service_areas: ['75201', '75202', '75203', '75204'],
    certifications: ['State Certified Process Server', 'Notary Public'],
    total_jobs_completed: 156,
    current_jobs_assigned: 8,
    average_rating: 4.8,
    created_at: new Date('2024-02-01'),
    updated_at: new Date()
  },
  {
    id: 'user_employee_2',
    company_id: 'company_12345',
    email: 'jessica.martinez@metropolitanprocess.com',
    first_name: 'Jessica',
    last_name: 'Martinez',
    full_name: 'Jessica Martinez',
    role: 'process_server',
    phone: '(555) 222-3333',
    address: '456 Process Ave, Dallas, TX 75207',
    is_active: true,
    hire_date: new Date('2024-01-25'),
    pay_rate: 50.00,
    service_areas: ['75205', '75206', '75207', '75208'],
    certifications: ['State Certified Process Server', 'Private Investigator License'],
    total_jobs_completed: 203,
    current_jobs_assigned: 12,
    average_rating: 4.9,
    created_at: new Date('2024-01-25'),
    updated_at: new Date()
  },
  {
    id: 'user_employee_3',
    company_id: 'company_12345',
    email: 'david.clark@metropolitanprocess.com',
    first_name: 'David',
    last_name: 'Clark',
    full_name: 'David Clark',
    role: 'process_server',
    phone: '(555) 333-4444',
    address: '789 Service St, Dallas, TX 75208',
    is_active: true,
    hire_date: new Date('2024-03-01'),
    pay_rate: 42.00,
    service_areas: ['75209', '75210', '75211', '75212'],
    certifications: ['State Certified Process Server'],
    total_jobs_completed: 89,
    current_jobs_assigned: 6,
    average_rating: 4.6,
    created_at: new Date('2024-03-01'),
    updated_at: new Date()
  },
  {
    id: 'user_admin_1',
    company_id: 'company_12345',
    email: 'admin@metropolitanprocess.com',
    first_name: 'Lisa',
    last_name: 'Brown',
    full_name: 'Lisa Brown',
    role: 'admin',
    phone: '(555) 444-5555',
    address: '1234 Business Center Drive, Suite 200, Dallas, TX 75201',
    is_active: true,
    hire_date: new Date('2024-01-15'),
    salary: 55000,
    created_at: new Date('2024-01-15'),
    updated_at: new Date()
  }
];

// Dummy jobs with various statuses and realistic data
export const dummyJobs = [
  {
    id: 'job_1',
    job_number: 'PS-2024-001234',
    company_id: 'company_12345',
    client_id: 'client_1',
    assigned_server_id: 'user_employee_1',
    case_number: 'CV-2024-001234',
    case_title: 'Anderson Law v. Smith Construction',
    document_type: 'Summons and Complaint',
    recipient: { name: 'Robert Smith' },
    addresses: [{
      address1: '123 Main Street',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75201'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Robert Smith',
    defendant_address: '123 Main Street',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75201',
    service_type: 'personal_service',
    status: 'served',
    priority: 'standard',
    amount: 85.00,
    server_pay: 45.00,
    rush_fee: 0,
    mileage_fee: 12.50,
    court_filing_fee: 0,
    due_date: getRandomDate(10, 5),
    created_date: getRandomDate(15),
    service_date: getRandomDate(5),
    attempts: 2,
    notes: 'Service completed successfully. Defendant was cooperative.',
    created_at: getRandomDate(15),
    updated_at: getRandomDate(5),
    service_details: {
      served_at: getRandomDate(5),
      person_served: 'Robert Smith',
      relationship: 'defendant',
      description: 'Personally served defendant at residence',
      server_notes: 'Defendant answered door and accepted documents'
    }
  },
  {
    id: 'job_2',
    job_number: 'PS-2024-005678',
    company_id: 'company_12345',
    client_id: 'client_2',
    assigned_server_id: 'user_employee_2',
    case_number: 'FC-2024-005678',
    case_title: 'First National Bank v. Davis',
    document_type: 'Foreclosure Notice',
    recipient: { name: 'Maria Davis' },
    addresses: [{
      address1: '456 Oak Avenue',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75202'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Maria Davis',
    defendant_address: '456 Oak Avenue',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75202',
    service_type: 'substitute_service',
    status: 'in_progress',
    priority: 'rush',
    amount: 125.00,
    server_pay: 50.00,
    rush_fee: 40.00,
    mileage_fee: 18.75,
    court_filing_fee: 0,
    due_date: getRandomDate(-2, 5),
    created_date: getRandomDate(8),
    service_date: null,
    attempts: 3,
    notes: 'Multiple attempts made. Defendant appears to be avoiding service.',
    created_at: getRandomDate(8),
    updated_at: getRandomDate(1)
  },
  {
    id: 'job_3',
    job_number: 'PS-2024-009876',
    company_id: 'company_12345',
    client_id: 'client_3',
    assigned_server_id: 'user_employee_1',
    case_number: 'EV-2024-009876',
    case_title: 'Metro Property v. Johnson',
    document_type: 'Eviction Notice',
    recipient: { name: 'James Johnson' },
    addresses: [{
      address1: '789 Elm Street',
      address2: 'Apt 2B',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75203'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'James Johnson',
    defendant_address: '789 Elm Street, Apt 2B',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75203',
    service_type: 'personal_service',
    status: 'served',
    priority: 'standard',
    amount: 75.00,
    server_pay: 45.00,
    rush_fee: 0,
    mileage_fee: 8.25,
    court_filing_fee: 0,
    due_date: getRandomDate(12, 3),
    created_date: getRandomDate(18),
    service_date: getRandomDate(12),
    attempts: 1,
    notes: 'Successfully served at first attempt.',
    created_at: getRandomDate(18),
    updated_at: getRandomDate(12),
    service_details: {
      served_at: getRandomDate(12),
      person_served: 'James Johnson',
      relationship: 'defendant',
      description: 'Personally served defendant at apartment',
      server_notes: 'Served at apartment door, defendant identified himself'
    }
  },
  {
    id: 'job_4',
    job_number: 'PS-2024-112233',
    company_id: 'company_12345',
    client_id: 'client_4',
    assigned_server_id: 'user_employee_3',
    case_number: 'TR-2024-112233',
    case_title: 'State of Texas v. Wilson',
    document_type: 'Court Summons',
    recipient: { name: 'Patricia Wilson' },
    addresses: [{
      address1: '321 Pine Road',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75204'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Patricia Wilson',
    defendant_address: '321 Pine Road',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75204',
    service_type: 'certified_mail',
    status: 'pending',
    priority: 'standard',
    amount: 65.00,
    server_pay: 35.00,
    rush_fee: 0,
    mileage_fee: 15.50,
    court_filing_fee: 25.00,
    due_date: getRandomDate(5, 10),
    created_date: getRandomDate(3),
    service_date: null,
    attempts: 0,
    notes: 'Newly assigned job. Server to begin attempts tomorrow.',
    created_at: getRandomDate(3),
    updated_at: getRandomDate(3)
  },
  {
    id: 'job_5',
    job_number: 'PS-2024-445566',
    company_id: 'company_12345',
    client_id: 'client_5',
    assigned_server_id: 'user_employee_2',
    case_number: 'CC-2024-445566',
    case_title: 'Corporate Collections v. Brown',
    document_type: 'Debt Collection Notice',
    recipient: { name: 'Michael Brown' },
    addresses: [{
      address1: '654 Maple Drive',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75205'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Michael Brown',
    defendant_address: '654 Maple Drive',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75205',
    service_type: 'personal_service',
    status: 'served',
    priority: 'rush',
    amount: 145.00,
    server_pay: 55.00,
    rush_fee: 50.00,
    mileage_fee: 22.00,
    court_filing_fee: 0,
    due_date: getRandomDate(7, 2),
    created_date: getRandomDate(12),
    service_date: getRandomDate(7),
    attempts: 2,
    notes: 'Rush service completed within deadline.',
    created_at: getRandomDate(12),
    updated_at: getRandomDate(7),
    service_details: {
      served_at: getRandomDate(7),
      person_served: 'Michael Brown',
      relationship: 'defendant',
      description: 'Personally served defendant at workplace',
      server_notes: 'Served at defendant\'s office during lunch break'
    }
  },
  // Additional jobs for more realistic data volume
  {
    id: 'job_6',
    job_number: 'PS-2024-001235',
    company_id: 'company_12345',
    client_id: 'client_1',
    assigned_server_id: 'user_employee_3',
    case_number: 'CV-2024-001235',
    case_title: 'Anderson Law v. Thompson LLC',
    document_type: 'Motion to Compel',
    recipient: { name: 'Thompson LLC' },
    addresses: [{
      address1: '888 Corporate Blvd',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75206'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Thompson LLC',
    defendant_address: '888 Corporate Blvd',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75206',
    service_type: 'corporate_service',
    status: 'in_progress',
    priority: 'standard',
    amount: 95.00,
    server_pay: 50.00,
    rush_fee: 0,
    mileage_fee: 20.00,
    court_filing_fee: 0,
    due_date: getRandomDate(2, 7),
    created_date: getRandomDate(5),
    service_date: null,
    attempts: 1,
    notes: 'Initial attempt made at registered agent office.',
    created_at: getRandomDate(5),
    updated_at: getRandomDate(2)
  },
  {
    id: 'job_7',
    job_number: 'PS-2024-005679',
    company_id: 'company_12345',
    client_id: 'client_2',
    assigned_server_id: null,
    case_number: 'FC-2024-005679',
    case_title: 'First National Bank v. Garcia',
    document_type: 'Foreclosure Notice',
    recipient: { name: 'Carlos Garcia' },
    addresses: [{
      address1: '777 Valley View Lane',
      address2: '',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75207'
    }],
    // Legacy fields for backward compatibility
    defendant_name: 'Carlos Garcia',
    defendant_address: '777 Valley View Lane',
    defendant_city: 'Dallas',
    defendant_state: 'TX',
    defendant_zip: '75207',
    service_type: 'personal_service',
    status: 'pending',
    priority: 'standard',
    amount: 85.00,
    server_pay: 45.00,
    rush_fee: 0,
    mileage_fee: 16.25,
    court_filing_fee: 0,
    due_date: getRandomDate(8, 5),
    created_date: getRandomDate(1),
    service_date: null,
    attempts: 0,
    notes: 'Awaiting server assignment.',
    created_at: getRandomDate(1),
    updated_at: getRandomDate(1)
  }
];

// Dummy invoices
export const dummyInvoices = [
  {
    id: 'invoice_1',
    company_id: 'company_12345',
    client_id: 'client_1',
    invoice_number: 'INV-2024-001',
    status: 'paid',
    total_amount: 595.00,
    subtotal: 595.00,
    tax_amount: 0,
    discount_amount: 0,
    payment_terms: 'net_30',
    due_date: getRandomDate(10),
    issue_date: getRandomDate(40),
    payment_date: getRandomDate(8),
    line_items: [
      { description: 'Process Service - CV-2024-001234', quantity: 1, rate: 85.00, amount: 85.00 },
      { description: 'Process Service - CV-2024-001235', quantity: 1, rate: 95.00, amount: 95.00 },
      { description: 'Rush Service Fee', quantity: 2, rate: 40.00, amount: 80.00 },
      { description: 'Mileage', quantity: 1, rate: 335.00, amount: 335.00 }
    ],
    notes: 'Payment received via ACH transfer.',
    created_at: getRandomDate(40),
    updated_at: getRandomDate(8)
  },
  {
    id: 'invoice_2',
    company_id: 'company_12345',
    client_id: 'client_2',
    invoice_number: 'INV-2024-002',
    status: 'paid',
    total_amount: 1280.00,
    subtotal: 1280.00,
    tax_amount: 0,
    discount_amount: 0,
    payment_terms: 'net_15',
    due_date: getRandomDate(25),
    issue_date: getRandomDate(35),
    payment_date: getRandomDate(20),
    line_items: [
      { description: 'Monthly Process Services', quantity: 16, rate: 80.00, amount: 1280.00 }
    ],
    notes: 'Monthly retainer payment received.',
    created_at: getRandomDate(35),
    updated_at: getRandomDate(20)
  },
  {
    id: 'invoice_3',
    company_id: 'company_12345',
    client_id: 'client_3',
    invoice_number: 'INV-2024-003',
    status: 'outstanding',
    total_amount: 450.00,
    subtotal: 450.00,
    tax_amount: 0,
    discount_amount: 0,
    payment_terms: 'net_30',
    due_date: getRandomDate(-5),
    issue_date: getRandomDate(25),
    payment_date: null,
    line_items: [
      { description: 'Eviction Service Package', quantity: 6, rate: 75.00, amount: 450.00 }
    ],
    notes: 'Invoice past due. Follow up required.',
    created_at: getRandomDate(25),
    updated_at: getRandomDate(5)
  },
  {
    id: 'invoice_4',
    company_id: 'company_12345',
    client_id: 'client_4',
    invoice_number: 'INV-2024-004',
    status: 'sent',
    total_amount: 875.00,
    subtotal: 850.00,
    tax_amount: 25.00,
    discount_amount: 0,
    payment_terms: 'net_45',
    due_date: getRandomDate(20),
    issue_date: getRandomDate(15),
    payment_date: null,
    line_items: [
      { description: 'Court Document Service', quantity: 10, rate: 65.00, amount: 650.00 },
      { description: 'Filing Fees', quantity: 8, rate: 25.00, amount: 200.00 }
    ],
    notes: 'Government invoice with extended payment terms.',
    created_at: getRandomDate(15),
    updated_at: getRandomDate(15)
  },
  {
    id: 'invoice_5',
    company_id: 'company_12345',
    client_id: 'client_5',
    invoice_number: 'INV-2024-005',
    status: 'paid',
    total_amount: 2190.00,
    subtotal: 2190.00,
    tax_amount: 0,
    discount_amount: 0,
    payment_terms: 'net_30',
    due_date: getRandomDate(18),
    issue_date: getRandomDate(28),
    payment_date: getRandomDate(15),
    line_items: [
      { description: 'Collection Notice Services', quantity: 15, rate: 85.00, amount: 1275.00 },
      { description: 'Rush Processing', quantity: 10, rate: 50.00, amount: 500.00 },
      { description: 'Skip Tracing Services', quantity: 5, rate: 83.00, amount: 415.00 }
    ],
    notes: 'Large collection agency monthly billing.',
    created_at: getRandomDate(28),
    updated_at: getRandomDate(15)
  }
];

// Dummy payments
export const dummyPayments = [
  {
    id: 'payment_1',
    company_id: 'company_12345',
    invoice_id: 'invoice_1',
    client_id: 'client_1',
    amount: 595.00,
    payment_method: 'ach_transfer',
    payment_date: getRandomDate(8),
    reference_number: 'ACH240315001',
    status: 'completed',
    notes: 'Automatic payment via ACH',
    created_at: getRandomDate(8),
    updated_at: getRandomDate(8)
  },
  {
    id: 'payment_2',
    company_id: 'company_12345',
    invoice_id: 'invoice_2',
    client_id: 'client_2',
    amount: 1280.00,
    payment_method: 'wire_transfer',
    payment_date: getRandomDate(20),
    reference_number: 'WIRE240308002',
    status: 'completed',
    notes: 'Wire transfer from First National Bank',
    created_at: getRandomDate(20),
    updated_at: getRandomDate(20)
  },
  {
    id: 'payment_3',
    company_id: 'company_12345',
    invoice_id: 'invoice_5',
    client_id: 'client_5',
    amount: 2190.00,
    payment_method: 'check',
    payment_date: getRandomDate(15),
    reference_number: 'CHK5543',
    status: 'completed',
    notes: 'Check payment deposited successfully',
    created_at: getRandomDate(15),
    updated_at: getRandomDate(15)
  }
];

// Dummy court cases for additional context
export const dummyCourtCases = [
  {
    id: 'case_1',
    company_id: 'company_12345',
    case_number: 'CV-2024-001234',
    case_title: 'Anderson Law v. Smith Construction',
    court_name: 'Dallas County District Court',
    judge_name: 'Hon. Patricia Williams',
    case_type: 'Civil',
    filing_date: getRandomDate(30),
    status: 'active',
    plaintiff: 'Anderson & Associates Law Firm',
    defendant: 'Smith Construction Company',
    created_at: getRandomDate(30),
    updated_at: getRandomDate(5)
  },
  {
    id: 'case_2',
    company_id: 'company_12345',
    case_number: 'FC-2024-005678',
    case_title: 'First National Bank v. Davis',
    court_name: 'Dallas County Civil Court',
    judge_name: 'Hon. Michael Chen',
    case_type: 'Foreclosure',
    filing_date: getRandomDate(25),
    status: 'pending',
    plaintiff: 'First National Bank',
    defendant: 'Maria Davis',
    created_at: getRandomDate(25),
    updated_at: getRandomDate(3)
  }
];

// Dummy server pay records
export const dummyServerPayRecords = [
  {
    id: 'pay_1',
    company_id: 'company_12345',
    server_id: 'user_employee_1',
    pay_period_start: getRandomDate(14),
    pay_period_end: getRandomDate(7),
    total_jobs: 12,
    total_pay: 540.00,
    status: 'paid',
    payment_date: getRandomDate(5),
    payment_method: 'direct_deposit',
    jobs_included: ['job_1', 'job_3'],
    created_at: getRandomDate(7),
    updated_at: getRandomDate(5)
  },
  {
    id: 'pay_2',
    company_id: 'company_12345',
    server_id: 'user_employee_2',
    pay_period_start: getRandomDate(14),
    pay_period_end: getRandomDate(7),
    total_jobs: 15,
    total_pay: 750.00,
    status: 'paid',
    payment_date: getRandomDate(5),
    payment_method: 'direct_deposit',
    jobs_included: ['job_2', 'job_5'],
    created_at: getRandomDate(7),
    updated_at: getRandomDate(5)
  }
];

// Complete dummy data export
export const dummyData = {
  company: dummyCompany,
  clients: dummyClients,
  employees: dummyEmployees,
  jobs: dummyJobs,
  invoices: dummyInvoices,
  payments: dummyPayments,
  courtCases: dummyCourtCases,
  serverPayRecords: dummyServerPayRecords
};

// Helper function to load all dummy data into context
export const loadDummyDataIntoContext = () => {
  return {
    company: dummyCompany,
    clients: dummyClients,
    employees: dummyEmployees,
    jobs: dummyJobs,
    invoices: dummyInvoices,
    payments: dummyPayments,
    courtCases: dummyCourtCases,
    serverPayRecords: dummyServerPayRecords,
    isLoading: false,
    error: null
  };
};

// Function to generate additional random jobs for testing
export const generateAdditionalJobs = (count = 20) => {
  const statuses = ['pending', 'in_progress', 'served', 'cancelled'];
  const priorities = ['standard', 'rush'];
  const serviceTypes = ['personal_service', 'substitute_service', 'certified_mail', 'corporate_service'];
  const documentTypes = ['Summons and Complaint', 'Foreclosure Notice', 'Eviction Notice', 'Court Summons', 'Motion to Compel', 'Subpoena'];

  const additionalJobs = [];

  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const isRush = priority === 'rush';
    const baseAmount = getRandomAmount(65, 95);
    const rushFee = isRush ? getRandomAmount(25, 50) : 0;
    const mileageFee = getRandomAmount(5, 25);

    const jobNum = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    additionalJobs.push({
      id: `job_${Date.now()}_${i}`,
      job_number: `PS-2024-${jobNum}`,
      company_id: 'company_12345',
      client_id: dummyClients[Math.floor(Math.random() * dummyClients.length)].id,
      assigned_server_id: status === 'pending' ? null : dummyEmployees[Math.floor(Math.random() * 3)].id,
      case_number: `GEN-2024-${jobNum}`,
      case_title: `Generated Case ${i + 1}`,
      document_type: documentTypes[Math.floor(Math.random() * documentTypes.length)],
      recipient: { name: `Test Defendant ${i + 1}` },
      addresses: [{
        address1: `${Math.floor(Math.random() * 9999) + 1} Test Street`,
        address2: '',
        city: 'Dallas',
        state: 'TX',
        postal_code: `752${String(Math.floor(Math.random() * 10)).padStart(2, '0')}`
      }],
      // Legacy fields for backward compatibility
      defendant_name: `Test Defendant ${i + 1}`,
      defendant_address: `${Math.floor(Math.random() * 9999) + 1} Test Street`,
      defendant_city: 'Dallas',
      defendant_state: 'TX',
      defendant_zip: `752${String(Math.floor(Math.random() * 10)).padStart(2, '0')}`,
      service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      status: status,
      priority: priority,
      amount: baseAmount + rushFee + mileageFee,
      server_pay: Math.floor(baseAmount * 0.5),
      rush_fee: rushFee,
      mileage_fee: mileageFee,
      court_filing_fee: Math.random() > 0.7 ? 25 : 0,
      due_date: getRandomDate(-5, 15),
      created_date: getRandomDate(30),
      service_date: status === 'served' ? getRandomDate(10) : null,
      attempts: status === 'pending' ? 0 : Math.floor(Math.random() * 4) + 1,
      notes: `Generated test job #${i + 1}`,
      created_at: getRandomDate(30),
      updated_at: getRandomDate(5)
    });
  }

  return additionalJobs;
};