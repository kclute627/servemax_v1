import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './config';
import {
  createUserSchema,
  USER_TYPES,
  EMPLOYEE_ROLES,
  CompanyManager,
  InvitationManager,
  canAccessCompanyData,
  getAccessibleCompanies
} from './schemas';
import { entities } from './database';

export class FirebaseAuth {
  static currentUser = null;
  static authStateChangeCallbacks = [];

  // Initialize auth state listener
  static initialize() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // User is signed in, get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          // If no user_type, the Firestore document might not be ready yet
          // Try a few times with delays for newly created users
          if (!userData.user_type) {
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries && !userData.user_type) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              const retryDoc = await getDoc(doc(db, 'users', user.uid));
              if (retryDoc.exists() && retryDoc.data().user_type) {
                Object.assign(userData, retryDoc.data());
                break;
              }
              retries++;
            }
          }

          this.currentUser = {
            uid: user.uid,
            email: user.email,
            full_name: user.displayName || userData.full_name,
            ...userData
          };

          // If user is a company owner or employee, load company data
          if (this.currentUser.company_id) {
            try {
              const company = await entities.Company.findById(this.currentUser.company_id);
              this.currentUser.company = company;
            } catch (error) {
              console.warn('Could not load company data:', error);
            }
          }
        } catch (error) {
          console.error('Error loading user data from Firestore:', error);
          // Fallback to basic auth data if Firestore fails
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            full_name: user.displayName
          };
        }
      } else {
        this.currentUser = null;
      }

      // Notify all callbacks
      this.authStateChangeCallbacks.forEach(callback => callback(this.currentUser));
    });
  }

  // Subscribe to auth state changes
  static onAuthStateChange(callback) {
    this.authStateChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.authStateChangeCallbacks = this.authStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  // Get current user
  static async me() {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }
    return this.currentUser;
  }

  // Refresh current user data from Firestore
  static async refreshCurrentUser() {
    if (!auth.currentUser) {
      this.currentUser = null;
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      this.currentUser = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        full_name: auth.currentUser.displayName || userData.full_name,
        ...userData
      };

      // Load company data if available
      if (this.currentUser.company_id) {
        try {
          const company = await entities.Company.findById(this.currentUser.company_id);
          this.currentUser.company = company;
        } catch (error) {
          console.warn('Could not load company data:', error);
        }
      }

      // Notify all callbacks of the updated user data
      this.authStateChangeCallbacks.forEach(callback => callback(this.currentUser));

      return this.currentUser;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return this.currentUser;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Register company owner (creates both user and company)
  static async registerCompanyOwner(userData, companyData) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const user = userCredential.user;

      // Update display name
      if (userData.full_name) {
        await updateProfile(user, { displayName: userData.full_name });
      }

      // Create company first
      const company = await CompanyManager.createCompany(companyData, user.uid);

      // Create user document with company association
      const userSchema = createUserSchema({
        ...userData,
        user_type: USER_TYPES.COMPANY_OWNER,
        company_id: company.id,
        employee_role: EMPLOYEE_ROLES.ADMIN
      });

      await setDoc(doc(db, 'users', user.uid), userSchema);

      // Create employee record for the company owner
      const employeeData = {
        user_id: user.uid,
        company_id: company.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone || '',
        role: EMPLOYEE_ROLES.ADMIN,
        is_default_server: true, // Company owner is the default server
        is_active: true,
        created_date: new Date(),
        updated_at: new Date()
      };

      await entities.Employee.create(employeeData);

      // Force refresh the current user data to include the new Firestore data
      await this.refreshCurrentUser();

      return { user, company };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Register employee or contractor via invitation
  static async registerViaInvitation(invitationToken, userData) {
    try {
      // Validate invitation
      const invitation = await InvitationManager.acceptInvitation(invitationToken);

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const user = userCredential.user;

      // Update display name
      if (userData.full_name) {
        await updateProfile(user, { displayName: userData.full_name });
      }

      // Create user document based on invitation
      let userSchema;
      if (invitation.user_type === USER_TYPES.EMPLOYEE) {
        userSchema = createUserSchema({
          ...userData,
          user_type: USER_TYPES.EMPLOYEE,
          company_id: invitation.company_id,
          employee_role: invitation.employee_role,
          invited_by: invitation.invited_by
        });
      } else if (invitation.user_type === USER_TYPES.INDEPENDENT_CONTRACTOR) {
        userSchema = createUserSchema({
          ...userData,
          user_type: USER_TYPES.INDEPENDENT_CONTRACTOR,
          companies: [invitation.company_id],
          invited_by: invitation.invited_by
        });
      }

      await setDoc(doc(db, 'users', user.uid), userSchema);

      return { user, invitation };
    } catch (error) {
      throw new Error(`Invitation registration failed: ${error.message}`);
    }
  }

  // Logout user
  static async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Update user data
  static async updateMyUserData(userData) {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        ...userData,
        updated_at: new Date()
      });

      // Update local currentUser object
      this.currentUser = { ...this.currentUser, ...userData };

      return this.currentUser;
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  // Update password
  static async updatePassword(newPassword) {
    if (!auth.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(`Password reset email failed: ${error.message}`);
    }
  }

  // Confirm password reset with code from email
  static async confirmPasswordReset(oobCode, newPassword) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
    } catch (error) {
      throw new Error(`Password reset confirmation failed: ${error.message}`);
    }
  }

  // Delete user account
  static async deleteAccount() {
    if (!auth.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      const userId = auth.currentUser.uid;

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));

      // Delete auth account
      await deleteUser(auth.currentUser);

      this.currentUser = null;
    } catch (error) {
      throw new Error(`Account deletion failed: ${error.message}`);
    }
  }

  // Permission checking methods
  static canAccessCompany(companyId) {
    return canAccessCompanyData(this.currentUser, companyId);
  }

  static getAccessibleCompanies() {
    return getAccessibleCompanies(this.currentUser);
  }

  // Trial and subscription methods
  static async getSubscriptionInfo() {
    if (!this.currentUser?.company_id) {
      throw new Error('No company associated with user');
    }
    return await CompanyManager.getCompanySubscriptionInfo(this.currentUser.company_id);
  }

  static async incrementTrialJobUsage() {
    if (!this.currentUser?.company_id) {
      throw new Error('No company associated with user');
    }
    return await CompanyManager.updateTrialJobsUsed(this.currentUser.company_id);
  }

  // Invitation methods
  static async sendInvitation(email, userType, employeeRole = null) {
    if (!this.currentUser?.company_id) {
      throw new Error('No company associated with user');
    }

    if (this.currentUser.user_type !== USER_TYPES.COMPANY_OWNER &&
        this.currentUser.employee_role !== EMPLOYEE_ROLES.ADMIN) {
      throw new Error('Insufficient permissions to send invitations');
    }

    return await InvitationManager.createInvitation({
      email,
      invited_by: this.currentUser.uid,
      company_id: this.currentUser.company_id,
      user_type: userType,
      employee_role: employeeRole
    });
  }

  static async getPendingInvitations() {
    if (!this.currentUser?.company_id) {
      throw new Error('No company associated with user');
    }
    return await InvitationManager.getPendingInvitationsByCompany(this.currentUser.company_id);
  }

  // Company management for contractors
  static async addCompanyConnection(companyId) {
    if (this.currentUser?.user_type !== USER_TYPES.INDEPENDENT_CONTRACTOR) {
      throw new Error('Only independent contractors can add company connections');
    }

    const companies = this.currentUser.companies || [];
    if (!companies.includes(companyId)) {
      companies.push(companyId);
      return await this.updateMyUserData({ companies });
    }
    return this.currentUser;
  }
}

// Initialize auth on import
FirebaseAuth.initialize();