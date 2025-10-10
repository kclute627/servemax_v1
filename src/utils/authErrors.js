// Firebase Auth Error Messages
export const getAuthErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';

  const errorCode = error.code;

  switch (errorCode) {
    // Authentication errors
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up blocked by browser. Please allow pop-ups and try again.';
    case 'auth/invalid-credential':
      return 'Invalid login credentials. Please check your email and password.';
    case 'auth/credential-already-in-use':
      return 'This credential is already associated with another account.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';

    // Password reset errors
    case 'auth/expired-action-code':
      return 'The password reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'The password reset link is invalid. Please request a new one.';
    case 'auth/user-token-expired':
      return 'Your session has expired. Please sign in again.';

    // Firestore errors
    case 'firestore/permission-denied':
      return 'You do not have permission to perform this action.';
    case 'firestore/unavailable':
      return 'Service temporarily unavailable. Please try again later.';
    case 'firestore/deadline-exceeded':
      return 'Request timed out. Please try again.';
    case 'firestore/resource-exhausted':
      return 'Service quota exceeded. Please try again later.';

    // Custom application errors
    case 'custom/registration-failed':
      return 'Registration failed. Please try again.';
    case 'custom/company-creation-failed':
      return 'Failed to create company. Please try again.';
    case 'custom/user-creation-failed':
      return 'Failed to create user account. Please try again.';

    default:
      // Try to extract meaningful message from error
      if (error.message) {
        // Clean up Firebase error messages
        let message = error.message;

        // Remove Firebase error prefixes
        message = message.replace(/^Firebase: Error \([^)]+\)\s*/, '');
        message = message.replace(/^Error:\s*/, '');

        // Capitalize first letter
        message = message.charAt(0).toUpperCase() + message.slice(1);

        return message;
      }

      return 'An unexpected error occurred. Please try again.';
  }
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateName = (name, fieldName = 'Name') => {
  if (!name || !name.trim()) return `${fieldName} is required`;
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters long`;
  if (name.trim().length > 50) return `${fieldName} must be less than 50 characters long`;
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return null; // Phone is optional

  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's a valid US phone number (10 or 11 digits)
  if (digitsOnly.length !== 10 && digitsOnly.length !== 11) {
    return 'Please enter a valid phone number (10 digits)';
  }

  // If 11 digits, first digit should be 1
  if (digitsOnly.length === 11 && digitsOnly[0] !== '1') {
    return 'Please enter a valid phone number';
  }

  return null;
};

export const validateCompanyName = (name) => {
  if (!name || !name.trim()) return 'Company name is required';
  if (name.trim().length < 2) return 'Company name must be at least 2 characters long';
  if (name.trim().length > 100) return 'Company name must be less than 100 characters long';
  return null;
};

export const validateWebsite = (website) => {
  if (!website) return null; // Website is optional

  // Remove whitespace
  const trimmed = website.trim();

  // Check if it's a valid URL format
  try {
    // Add protocol if missing
    const urlWithProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(urlWithProtocol);

    // Must have a valid hostname
    if (!url.hostname || url.hostname.length < 3) {
      return 'Please enter a valid website URL';
    }

    return null;
  } catch {
    return 'Please enter a valid website URL (e.g., www.company.com)';
  }
};

export const validatePasswords = (password, confirmPassword) => {
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;

  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  // Format as +1 (XXX) XXX-XXXX
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }

  return phone; // Return original if can't format
};