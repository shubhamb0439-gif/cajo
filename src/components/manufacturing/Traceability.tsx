import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/dateUtils';
import { ChevronDown, ChevronRight, Save, QrCode, X, Mail, FolderOpen } from 'lucide-react';
import QRCodeLib from 'qrcode';
import FilesPanel from './FilesPanel';

interface Assembly {
  id: string;
  bom_id: string;
  assembly_name: string;
  assembly_quantity: number;
  created_at: string;
  boms: {
    bom_name: string;
    bom_item_id: string;
    inventory_items: { id: string; item_name: string; item_serial_number_tracked: boolean };
  };
}

interface AssemblyUnit {
  id: string;
  assembly_id: string;
  assembly_unit_number: number;
  assembly_serial_number: string | null;
  delivered?: boolean;
}

interface ComponentInfo {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  serial_tracked: boolean;
}

interface UnitSerialData {
  productSerial: string;
  componentSerials: Record<string, string[]>;
}

export default function Traceability() {
  const { userProfile } = useAuth();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [expandedAssembly, setExpandedAssembly] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, AssemblyUnit[]>>({});
  const [components, setComponents] = useState<Record<string, ComponentInfo[]>>({});
  const [unitSerials, setUnitSerials] = useState<Record<string, UnitSerialData>>({});
  const [existingSerials, setExistingSerials] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [selectedUnitSerial, setSelectedUnitSerial] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{ id: string; number: number; assemblyName: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadAssemblies();

    const handleSaleItemUpdate = () => {
      setUnits({});
      setComponents({});
      setUnitSerials({});
      setExistingSerials({});
    };

    const subscription = supabase
      .channel('traceability_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, handleSaleItemUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, handleSaleItemUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assembly_units' }, handleSaleItemUpdate)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAssemblies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('assemblies')
      .select('*, boms(bom_name, bom_item_id, inventory_items(id, item_name, item_serial_number_tracked))')
      .order('created_at', { ascending: false });
    if (data) setAssemblies(data as Assembly[]);
    setLoading(false);
  };

  const loadUnitsAndComponents = async (assemblyId: string, bomId: string) => {
    const shouldLoadComponents = !components[assemblyId];

    let componentsInfo: ComponentInfo[] = components[assemblyId] || [];

    if (shouldLoadComponents) {
      const { data: bomItemsData } = await supabase
        .from('bom_items')
        .select('bom_component_item_id, bom_component_quantity, inventory_items(id, item_id, item_name, item_serial_number_tracked)')
        .eq('bom_id', bomId);

      if (bomItemsData) {
        componentsInfo = bomItemsData.map((bi: any) => ({
          id: bi.inventory_items.id,
          item_id: bi.inventory_items.item_id,
          item_name: bi.inventory_items.item_name,
          quantity: bi.bom_component_quantity,
          serial_tracked: bi.inventory_items.item_serial_number_tracked
        }));
        setComponents(prev => ({ ...prev, [assemblyId]: componentsInfo }));
      }
    }

    const { data: unitsData } = await supabase
      .from('assembly_units')
      .select('*')
      .eq('assembly_id', assemblyId)
      .order('assembly_unit_number');

    if (unitsData) {
      const unitIds = unitsData.map(u => u.id);
      const { data: deliveryData } = await supabase
        .from('sale_items')
        .select('assembly_unit_id, delivered')
        .in('assembly_unit_id', unitIds);

      const deliveryMap: Record<string, boolean> = {};
      if (deliveryData) {
        deliveryData.forEach(item => {
          deliveryMap[item.assembly_unit_id] = item.delivered;
        });
      }

      const unitsWithDelivery = unitsData.map(unit => ({
        ...unit,
        delivered: deliveryMap[unit.id] || false
      }));

      setUnits(prev => ({ ...prev, [assemblyId]: unitsWithDelivery }));

      const initialSerials: Record<string, UnitSerialData> = {};
      unitsWithDelivery.forEach(unit => {
        const componentSerials: Record<string, string[]> = {};
        componentsInfo.forEach(comp => {
          if (comp.serial_tracked) {
            componentSerials[comp.id] = Array(comp.quantity).fill('');
          }
        });
        initialSerials[unit.id] = {
          productSerial: unit.assembly_serial_number || '',
          componentSerials
        };
      });
      setUnitSerials(prev => ({ ...prev, ...initialSerials }));

      for (const unit of unitsData) {
        const { data: assemblyItemsData } = await supabase
          .from('assembly_items')
          .select('assembly_component_item_id, assembly_item_serial_number')
          .eq('assembly_unit_id', unit.id)
          .order('created_at');

        if (assemblyItemsData && assemblyItemsData.length > 0) {
          const existingSerialsForUnit: Record<string, string[]> = {};
          assemblyItemsData.forEach((ai: any) => {
            if (!existingSerialsForUnit[ai.assembly_component_item_id]) {
              existingSerialsForUnit[ai.assembly_component_item_id] = [];
            }
            existingSerialsForUnit[ai.assembly_component_item_id].push(ai.assembly_item_serial_number || '');
          });

          componentsInfo.forEach(comp => {
            if (comp.serial_tracked && !existingSerialsForUnit[comp.id]) {
              existingSerialsForUnit[comp.id] = Array(comp.quantity).fill('');
            } else if (comp.serial_tracked && existingSerialsForUnit[comp.id].length < comp.quantity) {
              const diff = comp.quantity - existingSerialsForUnit[comp.id].length;
              existingSerialsForUnit[comp.id].push(...Array(diff).fill(''));
            }
          });

          setExistingSerials(prev => ({
            ...prev,
            [unit.id]: existingSerialsForUnit
          }));
          setUnitSerials(prev => ({
            ...prev,
            [unit.id]: {
              ...prev[unit.id],
              componentSerials: existingSerialsForUnit
            }
          }));
        }
      }
    }
  };

  const toggleAssembly = async (assembly: Assembly) => {
    if (expandedAssembly === assembly.id) {
      setExpandedAssembly(null);
    } else {
      setExpandedAssembly(assembly.id);
      await loadUnitsAndComponents(assembly.id, assembly.bom_id);
    }
  };

  const handleSerialChange = (unitId: string, field: 'product' | string, value: string, index?: number) => {
    setUnitSerials(prev => {
      if (field === 'product') {
        return {
          ...prev,
          [unitId]: {
            ...prev[unitId],
            productSerial: value
          }
        };
      } else if (index !== undefined) {
        const componentSerials = { ...prev[unitId].componentSerials };
        const currentSerials = [...(componentSerials[field] || [])];
        currentSerials[index] = value;
        componentSerials[field] = currentSerials;
        return {
          ...prev,
          [unitId]: {
            ...prev[unitId],
            componentSerials
          }
        };
      }
      return prev;
    });
  };

  const handleSaveUnit = async (unit: AssemblyUnit, assemblyId: string) => {
    setSaving(unit.id);
    try {
      const serialData = unitSerials[unit.id];

      if (serialData.productSerial !== (unit.assembly_serial_number || '')) {
        await supabase
          .from('assembly_units')
          .update({ assembly_serial_number: serialData.productSerial || null })
          .eq('id', unit.id);
      }

      const componentsForAssembly = components[assemblyId] || [];
      for (const component of componentsForAssembly) {
        if (!component.serial_tracked) continue;

        const serialNumbers = serialData.componentSerials[component.id] || [];

        await supabase
          .from('assembly_items')
          .delete()
          .eq('assembly_unit_id', unit.id)
          .eq('assembly_component_item_id', component.id);

        const itemsToInsert = serialNumbers.map(serialNumber => ({
          assembly_id: assemblyId,
          assembly_unit_id: unit.id,
          assembly_component_item_id: component.id,
          assembly_item_serial_number: serialNumber || null,
          source_type: 'assembly',
          created_by: userProfile?.id
        }));

        if (itemsToInsert.length > 0) {
          await supabase
            .from('assembly_items')
            .insert(itemsToInsert);
        }
      }

      setExistingSerials(prev => ({
        ...prev,
        [unit.id]: serialData.componentSerials
      }));

      const { data: updatedUnit } = await supabase
        .from('assembly_units')
        .select('*')
        .eq('id', unit.id)
        .maybeSingle();

      if (updatedUnit) {
        setUnits(prev => ({
          ...prev,
          [assemblyId]: prev[assemblyId].map(u => u.id === unit.id ? updatedUnit : u)
        }));
      }

      alert('Serial numbers saved successfully!');
    } catch (error) {
      console.error('Error saving serials:', error);
      alert('Failed to save serial numbers');
    } finally {
      setSaving(null);
    }
  };

  const handleShowQRCode = async (serialNumber: string) => {
    if (!serialNumber) {
      alert('Please enter a product serial number first');
      return;
    }

    try {
      const dataUrl = await QRCodeLib.toDataURL(serialNumber, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setSelectedUnitSerial(serialNumber);
      setShowQRPanel(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    }
  };

  const handleEmailQRCode = async () => {
    if (!userProfile?.email || !qrCodeDataUrl) return;

    setSendingEmail(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-qr-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userProfile.email,
            serialNumber: selectedUnitSerial,
            qrCodeDataUrl: qrCodeDataUrl
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert(`QR Code sent to ${userProfile.email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShowFiles = (unitId: string, unitNumber: number, assemblyName: string) => {
    setSelectedUnit({ id: unitId, number: unitNumber, assemblyName });
    setShowFilesPanel(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="relative">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Assembly Traceability</h2>

      {assemblies.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No assemblies created yet</p>
      ) : (
        <div className="space-y-3">
          {assemblies.map(assembly => {
            const isExpanded = expandedAssembly === assembly.id;
            const assemblyUnits = units[assembly.id] || [];
            const assemblyComponents = components[assembly.id] || [];
            const productTracked = assembly.boms.inventory_items.item_serial_number_tracked;

            return (
              <div
                key={assembly.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleAssembly(assembly)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="text-left">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {assembly.assembly_name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        BOM: {assembly.boms.bom_name} → {assembly.boms.inventory_items.item_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {assembly.assembly_quantity} units
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(assembly.created_at)}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="space-y-4">
                      {assemblyUnits.map(unit => {
                        const unitSerial = unitSerials[unit.id] || { productSerial: '', componentSerials: {} };
                        const isSaving = saving === unit.id;
                        const isDelivered = unit.delivered || false;

                        return (
                          <div
                            key={unit.id}
                            className={`rounded-lg border p-4 ${
                              isDelivered
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  Unit #{unit.assembly_unit_number}
                                </h4>
                                {isDelivered && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    DELIVERED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleShowFiles(unit.id, unit.assembly_unit_number, assembly.assembly_name)}
                                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                  <span>Files</span>
                                </button>
                                {!isDelivered && productTracked && (
                                  <button
                                    onClick={() => handleShowQRCode(unitSerial.productSerial)}
                                    disabled={!unitSerial.productSerial}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <span>QR Code</span>
                                  </button>
                                )}
                                {!isDelivered && (
                                  <button
                                    onClick={() => handleSaveUnit(unit, assembly.id)}
                                    disabled={isSaving}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              {productTracked && (
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Product Serial Number: {assembly.boms.inventory_items.item_name}
                                  </label>
                                  <input
                                    type="text"
                                    value={unitSerial.productSerial}
                                    onChange={(e) => handleSerialChange(unit.id, 'product', e.target.value)}
                                    placeholder="Enter serial number"
                                    disabled={isDelivered}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                                      isDelivered
                                        ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 cursor-not-allowed'
                                        : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-green-500 dark:bg-slate-700'
                                    } dark:text-white`}
                                  />
                                </div>
                              )}

                              {assemblyComponents.filter(c => c.serial_tracked).length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Component Serial Numbers:
                                  </p>
                                  <div className="space-y-3">
                                    {assemblyComponents
                                      .filter(c => c.serial_tracked)
                                      .map(component => {
                                        const serialsForComponent = unitSerial.componentSerials[component.id] || [];
                                        return (
                                          <div key={component.id} className="space-y-2">
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                                              {component.item_name} ({component.item_id}) - Qty: {component.quantity}
                                            </label>
                                            {Array.from({ length: component.quantity }, (_, index) => (
                                              <div key={`${component.id}-${index}`} className="flex items-center space-x-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 w-8">#{index + 1}</span>
                                                <input
                                                  type="text"
                                                  value={serialsForComponent[index] || ''}
                                                  onChange={(e) => handleSerialChange(unit.id, component.id, e.target.value, index)}
                                                  placeholder="Enter serial number"
                                                  disabled={isDelivered}
                                                  className={`flex-1 px-3 py-2 text-sm border rounded-lg ${
                                                    isDelivered
                                                      ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 cursor-not-allowed'
                                                      : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-green-500 dark:bg-slate-700'
                                                  } dark:text-white`}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {!productTracked && assemblyComponents.filter(c => c.serial_tracked).length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                  No items in this assembly have serial number tracking enabled
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showQRPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowQRPanel(false)}
          />
          <div className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                QR Code
              </h3>
              <button
                onClick={() => setShowQRPanel(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Serial Number
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white break-all">
                  {selectedUnitSerial}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>

              <button
                onClick={handleEmailQRCode}
                disabled={sendingEmail}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors w-full justify-center"
              >
                <Mail className="w-5 h-5" />
                <span>{sendingEmail ? 'Sending...' : `Email to ${userProfile?.email}`}</span>
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                The QR code contains the product serial number and can be scanned to quickly identify this unit.
              </p>
            </div>
          </div>
        </>
      )}

      {selectedUnit && (
        <FilesPanel
          isOpen={showFilesPanel}
          onClose={() => setShowFilesPanel(false)}
          unitId={selectedUnit.id}
          unitNumber={selectedUnit.number}
          assemblyName={selectedUnit.assemblyName}
        />
      )}
    </div>
  );
}
