// Main Firebase service exports
export { auth, db, storage, functions } from './config';
export { FirebaseAuth } from './auth';
export { FirebaseEntity, entities } from './database';
export { FirebaseStorage } from './storage';
export { FirebaseFunctions } from './functions';

// Import for the namespace object
import { FirebaseAuth } from './auth';
import { entities } from './database';
import { FirebaseStorage } from './storage';
import { FirebaseFunctions } from './functions';

// Export everything under a firebase namespace for easy importing
export const firebase = {
  auth: FirebaseAuth,
  entities,
  storage: FirebaseStorage,
  functions: FirebaseFunctions
};