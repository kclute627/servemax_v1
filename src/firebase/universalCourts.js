/**
 * Universal Courts Collection
 *
 * A platform-wide shared database of court information.
 * This collection is NOT company-specific - all users contribute to and benefit from it.
 *
 * Purpose:
 * - Reduce Google Places API costs by caching court addresses
 * - Provide consistent court information across the platform
 * - Build a knowledge base of courts over time
 */

import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp
} from 'firebase/firestore';

const UNIVERSAL_COURTS_COLLECTION = 'universal_courts';

/**
 * Search for a court by name in the universal collection
 * @param {string} courtName - The full court name to search for
 * @returns {Promise<Object|null>} Court data if found, null otherwise
 */
export async function findCourtByName(courtName) {
  if (!courtName) {
    return null;
  }

  try {
    console.log('[UniversalCourts] Searching for court:', courtName);

    // Normalize the court name for comparison (lowercase, trim)
    const normalizedName = courtName.toLowerCase().trim();

    const courtsRef = collection(db, UNIVERSAL_COURTS_COLLECTION);
    const q = query(courtsRef, where('full_court_name_lower', '==', normalizedName));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const courtDoc = querySnapshot.docs[0];
      const courtData = courtDoc.data();

      console.log('[UniversalCourts] Court found in universal collection:', courtData);

      // Increment lookup count
      await updateDoc(doc(db, UNIVERSAL_COURTS_COLLECTION, courtDoc.id), {
        lookup_count: increment(1),
        last_accessed: serverTimestamp()
      });

      return {
        id: courtDoc.id,
        ...courtData
      };
    }

    console.log('[UniversalCourts] Court not found in universal collection');
    return null;
  } catch (error) {
    console.error('[UniversalCourts] Error searching for court:', error);
    return null;
  }
}

/**
 * Add a new court to the universal collection
 * @param {Object} courtData - Court information to save
 * @returns {Promise<string|null>} Document ID if successful, null otherwise
 */
export async function addCourtToUniversal(courtData) {
  if (!courtData.full_court_name) {
    console.error('[UniversalCourts] Cannot add court without full_court_name');
    return null;
  }

  try {
    console.log('[UniversalCourts] Adding court to universal collection:', courtData.full_court_name);

    // Check if court already exists first
    const existingCourt = await findCourtByName(courtData.full_court_name);
    if (existingCourt) {
      console.log('[UniversalCourts] Court already exists, skipping add');
      return existingCourt.id;
    }

    const courtsRef = collection(db, UNIVERSAL_COURTS_COLLECTION);

    const newCourtDoc = {
      full_court_name: courtData.full_court_name,
      full_court_name_lower: courtData.full_court_name.toLowerCase().trim(),
      branch_name: courtData.branch_name || '',
      court_address1: courtData.court_address1 || '',
      court_address2: courtData.court_address2 || '',
      court_city: courtData.court_city || '',
      court_state: courtData.court_state || '',
      court_zip: courtData.court_zip || '',
      county: courtData.county || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      lookup_count: 1,
      last_accessed: serverTimestamp(),
      source: courtData.source || 'google_places' // Track where the data came from
    };

    const docRef = await addDoc(courtsRef, newCourtDoc);
    console.log('[UniversalCourts] Court added successfully with ID:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('[UniversalCourts] Error adding court to universal collection:', error);
    return null;
  }
}

/**
 * Update existing court information in the universal collection
 * @param {string} courtId - Document ID of the court
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateUniversalCourt(courtId, updates) {
  try {
    console.log('[UniversalCourts] Updating court:', courtId);

    const courtRef = doc(db, UNIVERSAL_COURTS_COLLECTION, courtId);
    await updateDoc(courtRef, {
      ...updates,
      updated_at: serverTimestamp()
    });

    console.log('[UniversalCourts] Court updated successfully');
    return true;
  } catch (error) {
    console.error('[UniversalCourts] Error updating court:', error);
    return false;
  }
}

export default {
  findCourtByName,
  addCourtToUniversal,
  updateUniversalCourt
};
