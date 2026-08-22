import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create the default clinic
  let clinic = await prisma.clinic.findFirst();

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: 'PawCare Animal Hospital',
        email: 'clinic@pawcare.vet',
        phone: '+1-555-0100',
        address: '123 Vet Lane, Springfield',
        timezone: 'America/New_York',
        currency: 'LKR',
      },
    });
    console.log(`✅ Created clinic: ${clinic.name} (${clinic.id})`);
  } else {
    console.log(`ℹ️  Clinic already exists: ${clinic.name}`);
  }

  // Create default admin user
  const adminEmail = 'admin@pawcare.vet';
  const existingAdmin = await prisma.staffUser.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinic.id,
        email: adminEmail,
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Create a sample veterinarian
  const vetEmail = 'dr.smith@pawcare.vet';
  const existingVet = await prisma.staffUser.findUnique({ where: { email: vetEmail } });

  if (!existingVet) {
    const passwordHash = await bcrypt.hash('Vet@123456', 12);
    await prisma.staffUser.create({
      data: {
        clinic_id: clinic.id,
        email: vetEmail,
        password_hash: passwordHash,
        first_name: 'Sarah',
        last_name: 'Smith',
        role: 'VETERINARIAN',
        specialization: 'Small animals',
        license_number: 'VET-2024-001',
      },
    });
    console.log(`✅ Created veterinarian: ${vetEmail}`);
  }

  // Create sample inventory items (drugs, vaccines, supplies, equipment)
  const inventoryCount = await prisma.inventoryItem.count({ where: { clinic_id: clinic.id } });

  if (inventoryCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { clinic_id: clinic.id, name: 'Normal Saline 0.9% 500ml', category: 'SURGICAL_SUPPLY', unit: 'bag', unit_cost: 3.5, selling_price: 12, quantity_on_hand: 50, reorder_threshold: 10 },
        { clinic_id: clinic.id, name: 'Disposable Syringe 5ml', category: 'SURGICAL_SUPPLY', unit: 'each', unit_cost: 0.2, selling_price: 1.5, quantity_on_hand: 200, reorder_threshold: 50 },
        { clinic_id: clinic.id, name: 'IV Catheter 22G', category: 'SURGICAL_SUPPLY', unit: 'each', unit_cost: 1.2, selling_price: 6, quantity_on_hand: 80, reorder_threshold: 20 },
        { clinic_id: clinic.id, name: 'Surgical Gloves (pair)', category: 'SURGICAL_SUPPLY', unit: 'pair', unit_cost: 0.3, selling_price: 2, quantity_on_hand: 300, reorder_threshold: 50 },
        { clinic_id: clinic.id, name: 'Gauze Pads', category: 'SURGICAL_SUPPLY', unit: 'pack', unit_cost: 1.5, selling_price: 5, quantity_on_hand: 100, reorder_threshold: 20 },
        { clinic_id: clinic.id, name: 'Amoxicillin 250mg', category: 'MEDICATION', unit: 'tablet', unit_cost: 0.4, selling_price: 2, quantity_on_hand: 500, reorder_threshold: 100 },
        { clinic_id: clinic.id, name: 'Meloxicam 1.5mg/ml', category: 'MEDICATION', unit: 'ml', unit_cost: 0.6, selling_price: 3, quantity_on_hand: 200, reorder_threshold: 40 },
        { clinic_id: clinic.id, name: 'Tramadol 50mg', category: 'MEDICATION', unit: 'tablet', unit_cost: 0.5, selling_price: 2.5, quantity_on_hand: 150, reorder_threshold: 30, is_controlled: true },
        { clinic_id: clinic.id, name: 'Rabies Vaccine', category: 'VACCINE', unit: 'dose', unit_cost: 4, selling_price: 25, quantity_on_hand: 60, reorder_threshold: 15 },
        { clinic_id: clinic.id, name: 'DHPP Vaccine', category: 'VACCINE', unit: 'dose', unit_cost: 5, selling_price: 30, quantity_on_hand: 60, reorder_threshold: 15 },
        { clinic_id: clinic.id, name: 'Digital Thermometer', category: 'EQUIPMENT', unit: 'each', unit_cost: 15, quantity_on_hand: 10, reorder_threshold: 2 },
        { clinic_id: clinic.id, name: 'Blood Glucose Test Strips', category: 'DIAGNOSTIC_SUPPLY', unit: 'strip', unit_cost: 0.8, selling_price: 4, quantity_on_hand: 150, reorder_threshold: 30 },
        { clinic_id: clinic.id, name: 'Prescription Diet Food (dog, 5kg)', category: 'FOOD', unit: 'bag', unit_cost: 20, selling_price: 45, quantity_on_hand: 30, reorder_threshold: 5 },
      ],
    });
    console.log('✅ Created 13 sample inventory items');
  } else {
    console.log(`ℹ️  Inventory already has ${inventoryCount} item(s)`);
  }

  // Create sample billable services
  const serviceCount = await prisma.service.count({ where: { clinic_id: clinic.id } });

  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        { clinic_id: clinic.id, name: 'General Consultation', category: 'exam', price: 45, duration_minutes: 20 },
        { clinic_id: clinic.id, name: 'Wellness Exam', category: 'exam', price: 55, duration_minutes: 30 },
        { clinic_id: clinic.id, name: 'Vaccination Administration', category: 'procedure', price: 20, duration_minutes: 10 },
        { clinic_id: clinic.id, name: 'Dental Cleaning', category: 'procedure', price: 250, duration_minutes: 60 },
        { clinic_id: clinic.id, name: 'Spay / Neuter Surgery', category: 'procedure', price: 350, duration_minutes: 90 },
        { clinic_id: clinic.id, name: 'Blood Panel', category: 'lab', price: 65, duration_minutes: 15 },
        { clinic_id: clinic.id, name: 'X-Ray (single view)', category: 'lab', price: 85, duration_minutes: 20 },
        { clinic_id: clinic.id, name: 'Full Grooming Package', category: 'grooming', price: 40, duration_minutes: 45 },
      ],
    });
    console.log('✅ Created 8 sample services');
  } else {
    console.log(`ℹ️  Services already has ${serviceCount} entr${serviceCount === 1 ? 'y' : 'ies'}`);
  }

  // Create ward rooms and kennels
  const wardRoomCount = await prisma.room.count({ where: { clinic_id: clinic.id, type: 'ward' } });

  if (wardRoomCount === 0) {
    const wardA = await prisma.room.create({
      data: { clinic_id: clinic.id, name: 'Ward A', type: 'ward' },
    });
    const wardB = await prisma.room.create({
      data: { clinic_id: clinic.id, name: 'Ward B', type: 'ward' },
    });

    await prisma.kennelUnit.createMany({
      data: [
        { room_id: wardA.id, label: 'K-01', size: 'small' },
        { room_id: wardA.id, label: 'K-02', size: 'small' },
        { room_id: wardA.id, label: 'K-03', size: 'medium' },
        { room_id: wardA.id, label: 'K-04', size: 'medium' },
        { room_id: wardB.id, label: 'K-05', size: 'large' },
        { room_id: wardB.id, label: 'K-06', size: 'large' },
        { room_id: wardB.id, label: 'Cat Suite 1', size: 'small' },
        { room_id: wardB.id, label: 'Cat Suite 2', size: 'small' },
      ],
    });
    console.log('✅ Created 2 ward rooms with 8 kennels');
  } else {
    console.log(`ℹ️  Ward rooms already exist (${wardRoomCount})`);
  }

  const clinicId = clinic.id;

  // ── Additional staff (second vet, nurse, receptionist, lab tech) ──────────
  const extraStaff = [
    { email: 'dr.carter@pawcare.vet', password: 'Vet@123456', first_name: 'James', last_name: 'Carter', role: 'VETERINARIAN' as const, specialization: 'Surgery', license_number: 'VET-2024-002' },
    { email: 'nurse.amara@pawcare.vet', password: 'Nurse@123456', first_name: 'Amara', last_name: 'Silva', role: 'NURSE' as const },
    { email: 'receptionist@pawcare.vet', password: 'Front@123456', first_name: 'Dilani', last_name: 'Perera', role: 'RECEPTIONIST' as const },
    { email: 'labtech@pawcare.vet', password: 'Lab@123456', first_name: 'Ruwan', last_name: 'Bandara', role: 'LAB_TECHNICIAN' as const },
  ];

  for (const s of extraStaff) {
    const existing = await prisma.staffUser.findUnique({ where: { email: s.email } });
    if (!existing) {
      const password_hash = await bcrypt.hash(s.password, 12);
      await prisma.staffUser.create({
        data: {
          clinic_id: clinicId,
          email: s.email,
          password_hash,
          first_name: s.first_name,
          last_name: s.last_name,
          role: s.role,
          specialization: 'specialization' in s ? s.specialization : null,
          license_number: 'license_number' in s ? s.license_number : null,
        },
      });
      console.log(`✅ Created ${s.role.toLowerCase()}: ${s.email}`);
    }
  }

  // Re-fetch staff refs (works whether just-created or pre-existing)
  const drSmith = await prisma.staffUser.findUniqueOrThrow({ where: { email: vetEmail } });
  const drCarter = await prisma.staffUser.findUniqueOrThrow({ where: { email: 'dr.carter@pawcare.vet' } });
  const nurseAmara = await prisma.staffUser.findUniqueOrThrow({ where: { email: 'nurse.amara@pawcare.vet' } });

  const services = await prisma.service.findMany({ where: { clinic_id: clinicId } });
  const serviceByName = (name: string) => services.find((x) => x.name === name)!;
  const items = await prisma.inventoryItem.findMany({ where: { clinic_id: clinicId } });
  const itemByName = (name: string) => items.find((x) => x.name === name)!;
  const kennels = await prisma.kennelUnit.findMany({ where: { room: { clinic_id: clinicId } } });
  const kennelByLabel = (label: string) => kennels.find((x) => x.label === label)!;

  // Nudge one item below its reorder threshold so the low-stock alert has something to show.
  await prisma.inventoryItem.updateMany({
    where: { clinic_id: clinicId, name: 'Tramadol 50mg' },
    data: { quantity_on_hand: 8 },
  });

  // ── Demo scenario: owners, pets, a realistic week of appointments ─────────
  const ownerCount = await prisma.owner.count({ where: { clinic_id: clinicId } });

  if (ownerCount === 0) {
    function daysFromNow(days: number, hour = 9, minute = 0): Date {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      d.setDate(d.getDate() + days);
      return d;
    }

    async function makeOwnerWithPets(
      owner: { first_name: string; last_name: string; phone: string; email: string; address: string },
      pets: Array<{ name: string; species: string; breed: string; sex: string; weight_kg: number; dobYears: number }>,
    ) {
      const created = await prisma.owner.create({
        data: { clinic_id: clinicId, ...owner, preferred_contact: 'email' },
      });
      const createdPets = [];
      for (const p of pets) {
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - p.dobYears);
        createdPets.push(
          await prisma.pet.create({
            data: {
              owner_id: created.id,
              name: p.name,
              species: p.species as never,
              breed: p.breed,
              sex: p.sex,
              weight_kg: p.weight_kg,
              date_of_birth: dob,
            },
          }),
        );
      }
      return { owner: created, pets: createdPets };
    }

    interface ChargeInput { description: string; serviceId?: string; itemId?: string; quantity?: number; unitPrice: number }

    async function chargeAndInvoice(params: {
      medicalRecordId: string;
      ownerId: string;
      appointmentId?: string;
      createdBy: string;
      charges: ChargeInput[];
      status: 'PAID' | 'PARTIALLY_PAID' | 'SENT' | 'OVERDUE';
      paidAmount?: number;
      paymentMethod?: string;
      dueDaysAgo?: number;
    }) {
      const lineData = params.charges.map((c) => ({
        ...c,
        quantity: c.quantity ?? 1,
        total: (c.quantity ?? 1) * c.unitPrice,
      }));
      const subtotal = lineData.reduce((sum, c) => sum + c.total, 0);

      const invoice = await prisma.invoice.create({
        data: {
          clinic_id: clinicId,
          owner_id: params.ownerId,
          appointment_id: params.appointmentId ?? null,
          status: params.status,
          subtotal,
          total: subtotal,
          paid_amount: params.paidAmount ?? 0,
          due_date: params.dueDaysAgo !== undefined ? daysFromNow(-params.dueDaysAgo) : null,
        },
      });

      for (const c of lineData) {
        const lineItem = await prisma.invoiceLineItem.create({
          data: {
            invoice_id: invoice.id,
            service_id: c.serviceId ?? null,
            item_id: c.itemId ?? null,
            description: c.description,
            quantity: c.quantity,
            unit_price: c.unitPrice,
            total: c.total,
          },
        });
        await prisma.medicalRecordCharge.create({
          data: {
            medical_record_id: params.medicalRecordId,
            item_id: c.itemId ?? null,
            service_id: c.serviceId ?? null,
            description: c.description,
            quantity: c.quantity,
            unit_price: c.unitPrice,
            total: c.total,
            invoice_line_item_id: lineItem.id,
            created_by: params.createdBy,
          },
        });
      }

      if (params.paidAmount) {
        await prisma.payment.create({
          data: { invoice_id: invoice.id, amount: params.paidAmount, method: params.paymentMethod ?? 'cash' },
        });
      }

      return invoice;
    }

    async function completedVisit(params: {
      petId: string; ownerId: string; vetId: string; type: string; daysAgo: number; reason: string;
      chiefComplaint: string;
      vitals: { weight_kg: number; temperature_c: number; heart_rate_bpm: number; respiratory_rate: number; body_condition_score: number };
      soap: { note: string };
      diagnosis?: { code?: string; name: string };
    }) {
      const start = daysFromNow(-params.daysAgo, 10, 0);
      const end = daysFromNow(-params.daysAgo, 10, 30);
      const appointment = await prisma.appointment.create({
        data: {
          clinic_id: clinicId, pet_id: params.petId, vet_id: params.vetId,
          type: params.type as never, status: 'COMPLETED', start_at: start, end_at: end,
          reason: params.reason, checked_in_at: start,
        },
      });
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          pet_id: params.petId, appointment_id: appointment.id, vet_id: params.vetId,
          visit_date: start, chief_complaint: params.chiefComplaint,
        },
      });
      await prisma.vitals.create({ data: { medical_record_id: medicalRecord.id, ...params.vitals } });
      await prisma.soapNote.create({ data: { medical_record_id: medicalRecord.id, vet_id: params.vetId, ...params.soap } });
      if (params.diagnosis) {
        await prisma.diagnosis.create({
          data: { medical_record_id: medicalRecord.id, is_primary: true, ...params.diagnosis },
        });
      }
      return { appointment, medicalRecord };
    }

    // Owners + pets
    const { pets: [rocky] } = await makeOwnerWithPets(
      { first_name: 'Chamara', last_name: 'Rathnayake', phone: '+94 77 123 4567', email: 'chamara.r@example.com', address: '45 Galle Road, Colombo 03' },
      [{ name: 'Rocky', species: 'DOG', breed: 'Labrador Retriever', sex: 'M', weight_kg: 28, dobYears: 3 }],
    );
    const { owner: priyanka, pets: [luna, max] } = await makeOwnerWithPets(
      { first_name: 'Priyanka', last_name: 'Jayawardena', phone: '+94 71 234 5678', email: 'priyanka.j@example.com', address: '12 Havelock Road, Colombo 05' },
      [
        { name: 'Luna', species: 'CAT', breed: 'Persian', sex: 'F_SPAYED', weight_kg: 4.2, dobYears: 2 },
        { name: 'Max', species: 'DOG', breed: 'Beagle', sex: 'M_NEUTERED', weight_kg: 12, dobYears: 5 },
      ],
    );
    const { owner: kasun, pets: [bella] } = await makeOwnerWithPets(
      { first_name: 'Kasun', last_name: 'Wijesinghe', phone: '+94 76 345 6789', email: 'kasun.w@example.com', address: '78 High Level Road, Nugegoda' },
      [{ name: 'Bella', species: 'DOG', breed: 'German Shepherd', sex: 'F', weight_kg: 28, dobYears: 4 }],
    );
    const { owner: nimali, pets: [whiskers] } = await makeOwnerWithPets(
      { first_name: 'Nimali', last_name: 'Gunasekara', phone: '+94 70 456 7890', email: 'nimali.g@example.com', address: '9 Kandy Road, Kadawatha' },
      [{ name: 'Whiskers', species: 'CAT', breed: 'Domestic Shorthair', sex: 'F_SPAYED', weight_kg: 3.8, dobYears: 6 }],
    );
    const { owner: sanjeewa, pets: [coco] } = await makeOwnerWithPets(
      { first_name: 'Sanjeewa', last_name: 'Dissanayake', phone: '+94 75 567 8901', email: 'sanjeewa.d@example.com', address: '221 Negombo Road, Wattala' },
      [{ name: 'Coco', species: 'RABBIT', breed: 'Holland Lop', sex: 'M_NEUTERED', weight_kg: 1.8, dobYears: 1 }],
    );
    const { pets: [buddy, tweety] } = await makeOwnerWithPets(
      { first_name: 'Tharushi', last_name: 'Fernando', phone: '+94 72 678 9012', email: 'tharushi.f@example.com', address: '33 Baseline Road, Colombo 09' },
      [
        { name: 'Buddy', species: 'DOG', breed: 'Poodle', sex: 'M', weight_kg: 8, dobYears: 2 },
        { name: 'Tweety', species: 'BIRD', breed: 'Budgerigar', sex: 'M', weight_kg: 0.03, dobYears: 1 },
      ],
    );

    console.log('✅ Created 6 owners with 8 pets');

    // Allergies
    await prisma.allergy.createMany({
      data: [
        { pet_id: rocky.id, allergen: 'Chicken protein', reaction: 'Skin irritation and itching', severity: 'mild' },
        { pet_id: bella.id, allergen: 'Penicillin', reaction: 'Vomiting', severity: 'moderate' },
      ],
    });

    // Vaccination history
    await prisma.vaccination.createMany({
      data: [
        { pet_id: rocky.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-335), next_due_at: daysFromNow(30), administered_by: drSmith.id },
        { pet_id: max.id, vaccine_name: 'DHPP', administered_at: daysFromNow(-395), next_due_at: daysFromNow(-30), administered_by: drCarter.id },
        { pet_id: bella.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-240), next_due_at: daysFromNow(125), administered_by: drCarter.id },
        { pet_id: buddy.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-180), next_due_at: daysFromNow(185), administered_by: drSmith.id },
      ],
    });

    // ── Completed visits (with SOAP notes, vitals, charges, and invoices) ──

    const luVisit = await completedVisit({
      petId: luna.id, ownerId: priyanka.id, vetId: drSmith.id, type: 'WELLNESS_EXAM', daysAgo: 2,
      reason: 'Annual wellness check',
      chiefComplaint: 'Annual wellness check',
      vitals: { weight_kg: 4.2, temperature_c: 38.5, heart_rate_bpm: 180, respiratory_rate: 30, body_condition_score: 5 },
      soap: {
        note: 'Owner reports normal appetite and activity, no concerns. Alert, well-hydrated, coat in good condition. Heart and lungs clear on auscultation. Healthy adult cat, no abnormalities noted. Continue current diet, annual booster administered today, recheck in 12 months.',
      },
    });
    await chargeAndInvoice({
      medicalRecordId: luVisit.medicalRecord.id, ownerId: priyanka.id, appointmentId: luVisit.appointment.id,
      createdBy: drSmith.id,
      charges: [
        { description: 'Wellness Exam', serviceId: serviceByName('Wellness Exam').id, unitPrice: 55 },
        { description: 'Vaccination Administration', serviceId: serviceByName('Vaccination Administration').id, unitPrice: 20 },
        { description: 'Rabies Vaccine', itemId: itemByName('Rabies Vaccine').id, unitPrice: 25 },
      ],
      status: 'PAID', paidAmount: 100, paymentMethod: 'cash',
    });
    await prisma.vaccination.create({
      data: { pet_id: luna.id, vaccine_name: 'Rabies', administered_at: daysFromNow(-2), next_due_at: daysFromNow(363), administered_by: drSmith.id },
    });

    const wVisit = await completedVisit({
      petId: whiskers.id, ownerId: nimali.id, vetId: drSmith.id, type: 'VACCINATION', daysAgo: 5,
      reason: 'Annual booster vaccination',
      chiefComplaint: 'Annual booster vaccination',
      vitals: { weight_kg: 3.8, temperature_c: 38.3, heart_rate_bpm: 170, respiratory_rate: 28, body_condition_score: 5 },
      soap: {
        note: 'No concerns reported by owner. Healthy, active, normal exam findings. Healthy, vaccination administered without complication. Next booster due in 12 months.',
      },
    });
    await chargeAndInvoice({
      medicalRecordId: wVisit.medicalRecord.id, ownerId: nimali.id, appointmentId: wVisit.appointment.id,
      createdBy: drSmith.id,
      charges: [
        { description: 'Vaccination Administration', serviceId: serviceByName('Vaccination Administration').id, unitPrice: 20 },
        { description: 'DHPP Vaccine', itemId: itemByName('DHPP Vaccine').id, unitPrice: 30 },
      ],
      status: 'PAID', paidAmount: 50, paymentMethod: 'cash',
    });

    const coVisit = await completedVisit({
      petId: coco.id, ownerId: sanjeewa.id, vetId: drSmith.id, type: 'WELLNESS_EXAM', daysAgo: 7,
      reason: 'General wellness check',
      chiefComplaint: 'General wellness check for rabbit',
      vitals: { weight_kg: 1.8, temperature_c: 38.9, heart_rate_bpm: 200, respiratory_rate: 40, body_condition_score: 5 },
      soap: {
        note: 'Eating well, normal droppings, no concerns. Alert, teeth in good condition, no nasal discharge. Healthy rabbit. Routine care, recheck in 6 months.',
      },
    });
    await chargeAndInvoice({
      medicalRecordId: coVisit.medicalRecord.id, ownerId: sanjeewa.id, appointmentId: coVisit.appointment.id,
      createdBy: drSmith.id,
      charges: [{ description: 'General Consultation', serviceId: serviceByName('General Consultation').id, unitPrice: 45 }],
      status: 'OVERDUE', dueDaysAgo: 2,
    });

    // Bella — surgical case: completed visit, abnormal lab, hospitalization, prescription
    const beVisit = await completedVisit({
      petId: bella.id, ownerId: kasun.id, vetId: drCarter.id, type: 'SICK_VISIT', daysAgo: 3,
      reason: 'Limping on right hind leg',
      chiefComplaint: 'Limping on right hind leg, suspected ligament injury',
      vitals: { weight_kg: 28, temperature_c: 39.1, heart_rate_bpm: 110, respiratory_rate: 24, body_condition_score: 6 },
      soap: {
        note: 'Owner noticed limping after play at the park two days ago, worsening. Pain on palpation of right stifle, positive cranial drawer sign, mild joint effusion. Cranial cruciate ligament rupture, right hind limb. TPLO surgery performed same day. Post-op pain management and hospitalization for recovery monitoring.',
      },
      diagnosis: { code: 'VeNom-1234', name: 'Cranial Cruciate Ligament Rupture (right hind)' },
    });

    const beLabOrder = await prisma.labOrder.create({
      data: {
        pet_id: bella.id, ordered_by: drCarter.id, panel_name: 'Pre-Surgical Blood Panel',
        status: 'COMPLETED', ordered_at: daysFromNow(-3, 8, 0), completed_at: daysFromNow(-3, 9, 0),
      },
    });
    await prisma.labResult.createMany({
      data: [
        { lab_order_id: beLabOrder.id, medical_record_id: beVisit.medicalRecord.id, test_name: 'White Blood Cell Count', value: '18.2', unit: 'x10^9/L', reference_min: '6.0', reference_max: '17.0', is_abnormal: true },
        { lab_order_id: beLabOrder.id, medical_record_id: beVisit.medicalRecord.id, test_name: 'Hematocrit', value: '42', unit: '%', reference_min: '37', reference_max: '55', is_abnormal: false },
      ],
    });

    await chargeAndInvoice({
      medicalRecordId: beVisit.medicalRecord.id, ownerId: kasun.id, appointmentId: beVisit.appointment.id,
      createdBy: drCarter.id,
      charges: [
        { description: 'TPLO Surgery Procedure', unitPrice: 450 },
        { description: 'Blood Panel', serviceId: serviceByName('Blood Panel').id, unitPrice: 65 },
        { description: 'X-Ray (single view)', serviceId: serviceByName('X-Ray (single view)').id, unitPrice: 85 },
        { description: 'IV Catheter 22G', itemId: itemByName('IV Catheter 22G').id, unitPrice: 6 },
        { description: 'Normal Saline 0.9% 500ml', itemId: itemByName('Normal Saline 0.9% 500ml').id, quantity: 2, unitPrice: 12 },
        { description: 'Tramadol 50mg (pain management)', itemId: itemByName('Tramadol 50mg').id, quantity: 10, unitPrice: 2.5 },
        { description: 'Amoxicillin 250mg (dispensed)', itemId: itemByName('Amoxicillin 250mg').id, quantity: 20, unitPrice: 2 },
      ],
      status: 'PARTIALLY_PAID', paidAmount: 300, paymentMethod: 'card',
    });

    await prisma.prescription.create({
      data: {
        pet_id: bella.id, medical_record_id: beVisit.medicalRecord.id, prescribed_by: drCarter.id,
        drug_name: 'Amoxicillin 250mg', dosage: '250mg', frequency: 'Twice daily', duration_days: 10,
        quantity: 20, item_id: itemByName('Amoxicillin 250mg').id, dispensed_at: daysFromNow(-3),
      },
    });

    const k03 = kennelByLabel('K-03');
    const bellaHosp = await prisma.hospitalization.create({
      data: {
        pet_id: bella.id, kennel_id: k03.id, admitted_by: drCarter.id,
        reason: 'Post-TPLO surgery recovery and monitoring', admitted_at: daysFromNow(-3, 12, 0),
        estimated_stay_days: 5,
      },
    });
    await prisma.kennelUnit.update({ where: { id: k03.id }, data: { status: 'OCCUPIED' } });
    await prisma.careLog.createMany({
      data: [
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'vitals', notes: 'Vitals stable, temp 38.9°C, alert and responsive.', logged_at: daysFromNow(-2, 8, 0) },
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'medication', notes: 'Administered Tramadol 50mg for post-operative pain management.', logged_at: daysFromNow(-2, 14, 0) },
        { hospitalization_id: bellaHosp.id, performed_by: nurseAmara.id, type: 'feeding', notes: 'Ate half portion of prescription diet, encouraged more water intake.', logged_at: daysFromNow(-1, 18, 0) },
      ],
    });

    console.log('✅ Created 4 completed visits with SOAP notes, invoices, a lab result, and an active hospitalization');

    // ── Upcoming / in-progress / cancelled appointments (no medical record yet) ──
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: rocky.id, vet_id: drSmith.id, type: 'SICK_VISIT',
        status: 'CHECKED_IN', is_walk_in: true, start_at: daysFromNow(0, 9, 0), end_at: daysFromNow(0, 9, 30),
        checked_in_at: new Date(), reason: 'Itchy skin, possible allergy flare-up',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: max.id, vet_id: drCarter.id, type: 'WELLNESS_EXAM',
        status: 'SCHEDULED', start_at: daysFromNow(0, 14, 0), end_at: daysFromNow(0, 14, 30),
        reason: 'Annual check-up',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: buddy.id, vet_id: drSmith.id, type: 'DENTAL',
        status: 'CONFIRMED', start_at: daysFromNow(1, 10, 0), end_at: daysFromNow(1, 11, 0),
        reason: 'Dental cleaning',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: tweety.id, vet_id: drCarter.id, type: 'WELLNESS_EXAM',
        status: 'SCHEDULED', start_at: daysFromNow(2, 11, 0), end_at: daysFromNow(2, 11, 20),
        reason: 'First wellness visit',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: rocky.id, vet_id: drSmith.id, type: 'FOLLOW_UP',
        status: 'SCHEDULED', start_at: daysFromNow(4, 9, 30), end_at: daysFromNow(4, 9, 50),
        reason: 'Follow-up on skin allergy',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: max.id, vet_id: drSmith.id, type: 'GROOMING',
        status: 'CANCELLED', start_at: daysFromNow(-2, 13, 0), end_at: daysFromNow(-2, 13, 45),
        reason: 'Grooming', cancelled_at: daysFromNow(-3), cancel_reason: 'Owner rescheduled due to conflict',
      },
    });
    await prisma.appointment.create({
      data: {
        clinic_id: clinicId, pet_id: coco.id, vet_id: drCarter.id, type: 'DENTAL',
        status: 'NO_SHOW', start_at: daysFromNow(-4, 15, 0), end_at: daysFromNow(-4, 15, 30),
        reason: 'Teeth check',
      },
    });

    console.log('✅ Created 7 additional appointments (checked-in, scheduled, cancelled, no-show)');
  } else {
    console.log(`ℹ️  Demo scenario already seeded (${ownerCount} owner(s) exist)`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Default login credentials:');
  console.log('   Admin:          admin@pawcare.vet        / Admin@123');
  console.log('   Veterinarian:   dr.smith@pawcare.vet      / Vet@123456');
  console.log('   Veterinarian:   dr.carter@pawcare.vet     / Vet@123456');
  console.log('   Nurse:          nurse.amara@pawcare.vet   / Nurse@123456');
  console.log('   Receptionist:   receptionist@pawcare.vet  / Front@123456');
  console.log('   Lab Technician: labtech@pawcare.vet       / Lab@123456');
  console.log('\n⚠️  Change these passwords immediately after first login!\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
