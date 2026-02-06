import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  Plus,
  Minus,
  Info,
  Check
} from 'lucide-react';
import {
  PERMISSION_CATEGORIES,
  getBaseRolePermissions,
  getAddablePermissions,
  getRemovablePermissions
} from '@/utils/permissions';
import { EMPLOYEE_ROLES } from '@/firebase/schemas';

const ROLE_LABELS = {
  [EMPLOYEE_ROLES.ADMIN]: 'Administrator',
  [EMPLOYEE_ROLES.MANAGER]: 'Manager',
  [EMPLOYEE_ROLES.PROCESS_SERVER]: 'Process Server'
};

export default function PermissionEditor({
  user,
  permissionOverrides = { added: [], removed: [] },
  onPermissionOverridesChange,
  readOnly = false
}) {
  const [expandedCategories, setExpandedCategories] = useState(['JOBS']);

  // Calculate permissions
  const basePermissions = useMemo(() => getBaseRolePermissions(user), [user]);
  const addablePermissions = useMemo(() => getAddablePermissions(user), [user]);
  const removablePermissions = useMemo(() => getRemovablePermissions(user), [user]);

  // Current effective permissions
  const effectivePermissions = useMemo(() => {
    let perms = [...basePermissions];

    if (permissionOverrides.added) {
      perms = [...perms, ...permissionOverrides.added];
    }
    if (permissionOverrides.removed) {
      perms = perms.filter(p => !permissionOverrides.removed.includes(p));
    }

    return [...new Set(perms)];
  }, [basePermissions, permissionOverrides]);

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const handleAddPermission = (permissionKey) => {
    if (readOnly) return;

    const newAdded = [...(permissionOverrides.added || [])];
    const newRemoved = [...(permissionOverrides.removed || [])];

    // If it was in removed, just remove from removed
    if (newRemoved.includes(permissionKey)) {
      onPermissionOverridesChange({
        added: newAdded,
        removed: newRemoved.filter(p => p !== permissionKey)
      });
    } else if (!newAdded.includes(permissionKey)) {
      // Add to added list
      onPermissionOverridesChange({
        added: [...newAdded, permissionKey],
        removed: newRemoved
      });
    }
  };

  const handleRemovePermission = (permissionKey) => {
    if (readOnly) return;

    const newAdded = [...(permissionOverrides.added || [])];
    const newRemoved = [...(permissionOverrides.removed || [])];

    // If it was in added, just remove from added
    if (newAdded.includes(permissionKey)) {
      onPermissionOverridesChange({
        added: newAdded.filter(p => p !== permissionKey),
        removed: newRemoved
      });
    } else if (!newRemoved.includes(permissionKey)) {
      // Add to removed list
      onPermissionOverridesChange({
        added: newAdded,
        removed: [...newRemoved, permissionKey]
      });
    }
  };

  const getPermissionStatus = (permissionKey) => {
    const inBase = basePermissions.includes(permissionKey);
    const inAdded = (permissionOverrides.added || []).includes(permissionKey);
    const inRemoved = (permissionOverrides.removed || []).includes(permissionKey);

    if (inAdded) return 'added';
    if (inRemoved) return 'removed';
    if (inBase) return 'base';
    return 'none';
  };

  const resetOverrides = () => {
    if (readOnly) return;
    onPermissionOverridesChange({ added: [], removed: [] });
  };

  const hasOverrides = (permissionOverrides.added?.length > 0) || (permissionOverrides.removed?.length > 0);

  return (
    <div className="space-y-6">
      {/* Current Role Info */}
      <Card className="bg-slate-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Current Role</p>
                <p className="font-semibold text-slate-900">
                  {ROLE_LABELS[user.employee_role] || user.employee_role}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Effective Permissions</p>
              <p className="font-semibold text-slate-900">{effectivePermissions.length} active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overrides Summary */}
      {hasOverrides && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-800">
              {permissionOverrides.added?.length > 0 && (
                <span className="mr-3">
                  <Badge className="bg-green-100 text-green-700 mr-1">+{permissionOverrides.added.length}</Badge>
                  added
                </span>
              )}
              {permissionOverrides.removed?.length > 0 && (
                <span>
                  <Badge className="bg-red-100 text-red-700 mr-1">-{permissionOverrides.removed.length}</Badge>
                  removed
                </span>
              )}
            </span>
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={resetOverrides} className="text-blue-600 hover:text-blue-800">
                Reset to Role Defaults
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Categories */}
      <div className="space-y-3">
        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
          const isExpanded = expandedCategories.includes(categoryKey);

          // Count permissions in this category
          const categoryPermissionKeys = category.permissions.map(p => p.key);
          const activeInCategory = categoryPermissionKeys.filter(k => effectivePermissions.includes(k)).length;

          return (
            <Card key={categoryKey}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(categoryKey)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{category.label}</CardTitle>
                        <Badge variant="outline" className="font-normal">
                          {activeInCategory}/{category.permissions.length}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-500 mb-4">{category.description}</p>

                    <div className="space-y-2">
                      {category.permissions.map((permission) => {
                        const status = getPermissionStatus(permission.key);
                        const isActive = effectivePermissions.includes(permission.key);
                        const canAdd = addablePermissions.includes(permission.key) || status === 'removed';
                        const canRemove = removablePermissions.includes(permission.key) || status === 'added';

                        return (
                          <div
                            key={permission.key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              status === 'added' ? 'bg-green-50 border-green-200' :
                              status === 'removed' ? 'bg-red-50 border-red-200' :
                              isActive ? 'bg-slate-50 border-slate-200' :
                              'bg-white border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                status === 'added' ? 'bg-green-100' :
                                status === 'removed' ? 'bg-red-100' :
                                isActive ? 'bg-slate-200' :
                                'bg-slate-100'
                              }`}>
                                {status === 'added' ? (
                                  <Plus className="w-4 h-4 text-green-600" />
                                ) : status === 'removed' ? (
                                  <Minus className="w-4 h-4 text-red-600" />
                                ) : isActive ? (
                                  <Check className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <ShieldOff className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className={`font-medium ${
                                  status === 'removed' ? 'text-slate-400 line-through' :
                                  isActive ? 'text-slate-900' : 'text-slate-500'
                                }`}>
                                  {permission.label}
                                </p>
                                <p className="text-xs text-slate-500">{permission.description}</p>
                              </div>
                            </div>

                            {!readOnly && (
                              <div className="flex items-center gap-2">
                                {/* Status badge */}
                                {status === 'base' && (
                                  <Badge variant="outline" className="text-xs">From Role</Badge>
                                )}
                                {status === 'added' && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Added</Badge>
                                )}
                                {status === 'removed' && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">Removed</Badge>
                                )}

                                {/* Action buttons */}
                                {!isActive && canAdd && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddPermission(permission.key)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                                {isActive && canRemove && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemovePermission(permission.key)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {readOnly && (
        <p className="text-sm text-slate-500 text-center">
          Permission customization is view-only. Contact an administrator to modify.
        </p>
      )}
    </div>
  );
}
