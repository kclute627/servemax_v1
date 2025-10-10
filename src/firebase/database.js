import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

export class FirebaseEntity {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Find all documents with optional filtering
  async find(queryOptions = {}) {
    try {
      let q = this.collectionRef;

      // Add where clauses
      if (queryOptions.where) {
        for (const [field, operator, value] of queryOptions.where) {
          q = query(q, where(field, operator, value));
        }
      }

      // Add ordering
      if (queryOptions.orderBy) {
        const [field, direction = 'asc'] = queryOptions.orderBy;
        q = query(q, orderBy(field, direction));
      }

      // Add limit
      if (queryOptions.limit) {
        q = query(q, limit(queryOptions.limit));
      }

      // Add pagination
      if (queryOptions.startAfter) {
        q = query(q, startAfter(queryOptions.startAfter));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to regular dates
        created_at: doc.data().created_at?.toDate?.() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.() || doc.data().updated_at
      }));
    } catch (error) {
      console.error(`Error finding ${this.collectionName}:`, error);
      throw new Error(`Failed to find ${this.collectionName}: ${error.message}`);
    }
  }

  // Simple filter method (mimics Base44's filter method)
  async filter(filterObj) {
    const whereConditions = Object.entries(filterObj).map(([key, value]) => [key, '==', value]);
    return this.find({ where: whereConditions });
  }

  // Find document by ID
  async findById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error finding ${this.collectionName} by ID:`, error);
      throw new Error(`Failed to find ${this.collectionName}: ${error.message}`);
    }
  }

  // Create new document
  async create(data) {
    try {
      const timestamp = serverTimestamp();
      const docData = {
        ...data,
        created_at: timestamp,
        updated_at: timestamp
      };

      const docRef = await addDoc(this.collectionRef, docData);

      // Return the created document with ID
      return {
        id: docRef.id,
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw new Error(`Failed to create ${this.collectionName}: ${error.message}`);
    }
  }

  // Create new document with specific ID
  async createWithId(id, data) {
    try {
      const timestamp = serverTimestamp();
      const docData = {
        ...data,
        created_at: timestamp,
        updated_at: timestamp
      };

      const docRef = doc(db, this.collectionName, id);
      await setDoc(docRef, docData);

      // Return the created document with ID
      return {
        id: id,
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionName} with ID:`, error);
      throw new Error(`Failed to create ${this.collectionName} with ID: ${error.message}`);
    }
  }

  // Update document
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData = {
        ...data,
        updated_at: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Return updated document
      return this.findById(id);
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw new Error(`Failed to update ${this.collectionName}: ${error.message}`);
    }
  }

  // Delete document
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return { id, deleted: true };
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw new Error(`Failed to delete ${this.collectionName}: ${error.message}`);
    }
  }

  // List all documents (convenience method, same as find with no filters)
  async list() {
    return this.find();
  }

  // Bulk create multiple documents at once using batch
  async bulkCreate(dataArray) {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      const createdDocs = [];

      for (const data of dataArray) {
        const docRef = doc(collection(db, this.collectionName));
        const docData = {
          ...data,
          created_at: timestamp,
          updated_at: timestamp
        };
        batch.set(docRef, docData);
        createdDocs.push({
          id: docRef.id,
          ...data,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await batch.commit();
      return createdDocs;
    } catch (error) {
      console.error(`Error bulk creating ${this.collectionName}:`, error);
      throw new Error(`Failed to bulk create ${this.collectionName}: ${error.message}`);
    }
  }

  // Real-time listener for collection changes
  onSnapshot(callback, queryOptions = {}) {
    let q = this.collectionRef;

    // Add query options similar to find()
    if (queryOptions.where) {
      for (const [field, operator, value] of queryOptions.where) {
        q = query(q, where(field, operator, value));
      }
    }

    if (queryOptions.orderBy) {
      const [field, direction = 'asc'] = queryOptions.orderBy;
      q = query(q, orderBy(field, direction));
    }

    if (queryOptions.limit) {
      q = query(q, limit(queryOptions.limit));
    }

    return onSnapshot(q, (querySnapshot) => {
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.() || doc.data().created_at,
        updated_at: doc.data().updated_at?.toDate?.() || doc.data().updated_at
      }));
      callback(documents);
    });
  }

  // Real-time listener for document changes
  onDocumentSnapshot(id, callback) {
    const docRef = doc(db, this.collectionName, id);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          id: docSnap.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        });
      } else {
        callback(null);
      }
    });
  }
}

// Create entity instances for all collections
export const entities = {
  Client: new FirebaseEntity('clients'), // Deprecated - use Company for clients
  Job: new FirebaseEntity('jobs'),
  Employee: new FirebaseEntity('employees'),
  Invoice: new FirebaseEntity('invoices'),
  Payment: new FirebaseEntity('payments'),
  StripeCustomer: new FirebaseEntity('stripe_customers'),
  CourtCase: new FirebaseEntity('court_cases'),
  Document: new FirebaseEntity('documents'),
  Attempt: new FirebaseEntity('attempts'),
  Court: new FirebaseEntity('courts'),
  CompanySettings: new FirebaseEntity('company_settings'),
  ServerPayRecord: new FirebaseEntity('server_pay_records'),
  // New multi-tenant collections
  Company: new FirebaseEntity('companies'),
  CompanyStats: new FirebaseEntity('company_stats'),
  Invitation: new FirebaseEntity('invitations'),
  Subscription: new FirebaseEntity('subscriptions'),
  Directory: new FirebaseEntity('directory'),
  // Marketplace collections
  MarketplaceJob: new FirebaseEntity('marketplace_jobs'),
  MarketplaceBid: new FirebaseEntity('marketplace_bids')
};