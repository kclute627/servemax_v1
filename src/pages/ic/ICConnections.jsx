import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Mail,
  Phone,
  AlertCircle
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function ICConnections() {
  const { user, userData } = useOutletContext();
  const { toast } = useToast();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadConnections();
  }, [user]);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      // Get pending connection requests
      const pendingQuery = query(
        collection(db, "ic_connection_requests"),
        where("ic_user_id", "==", user.uid),
        where("status", "==", "pending")
      );
      const pendingSnap = await getDocs(pendingQuery);
      setPendingRequests(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Get active connections (companies in user's companies array)
      const companyIds = userData?.companies || [];
      const companies = [];

      for (const companyId of companyIds) {
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        if (companyDoc.exists()) {
          companies.push({ id: companyDoc.id, ...companyDoc.data() });
        }
      }

      setActiveConnections(companies);
    } catch (error) {
      console.error("Error loading connections:", error);
      toast({
        variant: "destructive",
        title: "Error loading connections",
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (requestId, accept) => {
    setProcessingId(requestId);
    try {
      const functions = getFunctions();
      const respondToICConnection = httpsCallable(functions, 'respondToICConnection');

      const result = await respondToICConnection({
        connection_request_id: requestId,
        accept: accept
      });

      toast({
        title: accept ? "Connection Accepted" : "Connection Declined",
        description: result.data.message
      });

      // Refresh connections
      await loadConnections();
    } catch (error) {
      console.error("Error responding to connection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to respond. Please try again."
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = date.toDate?.() || new Date(date);
      return format(d, "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="text-slate-600 mt-1">
          Manage your company connections
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pending Connection Requests
              <Badge className="bg-yellow-500 text-white ml-2">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              These companies want to send you job assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {request.requesting_company_name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Requested on {formatDate(request.created_at)}
                      </p>
                      {request.expires_at && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Expires {formatDate(request.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleRespond(request.id, false)}
                      disabled={processingId === request.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleRespond(request.id, true)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Active Connections
          </CardTitle>
          <CardDescription>
            Companies you&apos;re connected with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeConnections.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No connections yet</h3>
              <p className="text-slate-600">
                When companies invite you to work with them, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeConnections.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      {company.branding?.logo_url ? (
                        <img
                          src={company.branding.logo_url}
                          alt={company.name}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {company.name || company.company_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        {company.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {company.email}
                          </span>
                        )}
                        {company.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {company.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeConnections.length}</p>
                <p className="text-sm text-slate-500">Active Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-slate-500">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
