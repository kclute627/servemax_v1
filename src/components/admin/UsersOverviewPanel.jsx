import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  Loader2,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { AdminStatsManager } from '@/firebase/adminStats';

export default function UsersOverviewPanel() {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = companies.filter(
        (company) =>
          company.name?.toLowerCase().includes(query) ||
          company.email?.toLowerCase().includes(query) ||
          company.city?.toLowerCase().includes(query) ||
          company.state?.toLowerCase().includes(query)
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const allCompanies = await AdminStatsManager.getAllCompanies();
      // Sort by created date (newest first)
      const sorted = allCompanies.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setCompanies(sorted);
      setFilteredCompanies(sorted);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEmployeeCount = (company) => {
    if (!company.company_employees) return 1; // Owner only
    return company.company_employees.length + 1; // Employees + owner
  };

  const getCompanyTypeBadge = (company) => {
    if (company.company_type === 'independent_contractor') {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Independent Contractor
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <Building2 className="w-3 h-3 mr-1" />
        Process Serving
      </Badge>
    );
  };

  const getSubscriptionBadge = (company) => {
    const status = company.subscription_status || company.billing_tier;

    if (company.company_type === 'independent_contractor') {
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
          Free Tier
        </Badge>
      );
    }

    if (status === 'active') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CreditCard className="w-3 h-3 mr-1" />
          Paying
        </Badge>
      );
    }

    if (status === 'trial') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          Trial
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
        {status || 'Unknown'}
      </Badge>
    );
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 text-slate-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading...</span>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Companies & Users</h2>
          <p className="text-slate-600">All registered companies on the platform</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Companies Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Companies
            </span>
            <Badge variant="outline" className="text-sm">
              {filteredCompanies.length} of {companies.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>
                  {searchQuery ? 'No companies found matching your search' : 'No companies yet'}
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredCompanies.map((company, index) => (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                  >
                    {/* Company Header */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${
                          company.company_type === 'independent_contractor'
                            ? 'bg-purple-100'
                            : 'bg-blue-100'
                        }`}>
                          {company.company_type === 'independent_contractor' ? (
                            <UserCheck className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Building2 className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-sm">
                            {company.name || 'Unnamed Company'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Since {formatDate(company.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getCompanyTypeBadge(company)}
                        {getSubscriptionBadge(company)}
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="space-y-2 text-sm">
                      {company.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{company.email}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      {(company.city || company.state) && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {company.city}
                            {company.city && company.state && ', '}
                            {company.state}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {getEmployeeCount(company)} {getEmployeeCount(company) === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                      {company.staff_size && (
                        <Badge variant="outline" className="text-xs">
                          {company.staff_size.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {companies.filter(c => c.company_type === 'process_serving').length}
              </div>
              <p className="text-sm text-slate-600">Process Serving</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {companies.filter(c => c.company_type === 'independent_contractor').length}
              </div>
              <p className="text-sm text-slate-600">Independent</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {companies.filter(c =>
                  c.subscription_status === 'active' || c.billing_tier === 'paid'
                ).length}
              </div>
              <p className="text-sm text-slate-600">Paying Users</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {companies.filter(c =>
                  c.subscription_status === 'trial' || c.billing_tier === 'trial'
                ).length}
              </div>
              <p className="text-sm text-slate-600">Trial Users</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-600">
                {companies.reduce((sum, c) => sum + getEmployeeCount(c), 0)}
              </div>
              <p className="text-sm text-slate-600">Total Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
