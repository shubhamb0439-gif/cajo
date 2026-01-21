import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Upload, Database, AlertTriangle, CheckCircle } from 'lucide-react';

interface BackupData {
  timestamp: string;
  version: string;
  data: {
    dropdown_values?: any[];
    vendors?: any[];
    inventory_items?: any[];
    boms?: any[];
    bom_items?: any[];
    purchases?: any[];
    purchase_items?: any[];
    assemblies?: any[];
    assembly_units?: any[];
    assembly_items?: any[];
    leads?: any[];
    prospects?: any[];
    customers?: any[];
    sales?: any[];
    sale_items?: any[];
    deliveries?: any[];
    delivery_items?: any[];
    devices?: any[];
    tickets?: any[];
  };
}

export default function BulkUpload() {
  const { userProfile, hasWriteAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = (type: 'items' | 'vendors') => {
    const headers = type === 'items'
      ? ['item_id', 'item_name', 'item_display_name', 'item_unit', 'item_group', 'item_class', 'item_stock_min', 'item_stock_max', 'item_stock_reorder', 'item_serial_number_tracked']
      : ['vendor_id', 'vendor_name', 'vendor_name_legal', 'vendor_group', 'vendor_contact_name', 'vendor_email', 'vendor_phone', 'vendor_address', 'vendor_currency', 'vendor_rating_price', 'vendor_rating_quality', 'vendor_rating_lead'];

    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadData = async (type: 'items' | 'vendors') => {
    setLoading(true);
    try {
      const { data } = await supabase.from(type === 'items' ? 'inventory_items' : 'vendors').select('*');
      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No data to export' });
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: `${type} exported successfully` });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportPurchases = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('purchases')
        .select('*, inventory_items(item_name), vendors(vendor_name)')
        .order('purchase_date', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No purchases to export' });
        return;
      }

      const formattedData = data.map(p => ({
        purchase_id: p.purchase_id,
        purchase_date: p.purchase_date,
        item_id: p.purchase_item_id,
        item_name: p.inventory_items?.item_name || '',
        vendor_id: p.purchase_vendor_id,
        vendor_name: p.vendors?.vendor_name || '',
        vendor_item_code: p.purchase_vendor_item_code || '',
        quantity_ordered: p.purchase_qty_ordered,
        quantity_received: p.purchase_qty_received,
        quantity_allocated: p.purchase_qty_allocated,
        unit_price: p.purchase_unit_price,
        currency: p.purchase_currency,
        lead_time_days: p.purchase_lead_time || '',
        notes: p.purchase_notes || '',
      }));

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchases_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Purchases exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportBOM = async () => {
    setLoading(true);
    try {
      const { data: boms } = await supabase
        .from('boms')
        .select(`
          *,
          assembled_item:inventory_items!boms_bom_assembly_item_id_fkey(item_id, item_name),
          bom_items(
            *,
            component_item:inventory_items!bom_items_bom_component_item_id_fkey(item_id, item_name)
          )
        `)
        .order('bom_id', { ascending: true });

      if (!boms || boms.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No BOMs to export' });
        return;
      }

      const formattedData: any[] = [];
      boms.forEach(bom => {
        if (bom.bom_items && Array.isArray(bom.bom_items)) {
          bom.bom_items.forEach((item: any) => {
            formattedData.push({
              bom_id: bom.bom_id,
              bom_name: bom.bom_name,
              assembled_item_id: bom.bom_assembly_item_id,
              assembled_item_name: bom.assembled_item?.item_name || '',
              assembly_quantity: bom.bom_assembly_qty,
              component_item_id: item.bom_component_item_id,
              component_item_name: item.component_item?.item_name || '',
              component_quantity: item.bom_component_qty,
              notes: bom.bom_notes || '',
            });
          });
        } else {
          formattedData.push({
            bom_id: bom.bom_id,
            bom_name: bom.bom_name,
            assembled_item_id: bom.bom_assembly_item_id,
            assembled_item_name: bom.assembled_item?.item_name || '',
            assembly_quantity: bom.bom_assembly_qty,
            component_item_id: '',
            component_item_name: '',
            component_quantity: '',
            notes: bom.bom_notes || '',
          });
        }
      });

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bom_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'BOM exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportAssemblies = async () => {
    setLoading(true);
    try {
      const { data: assemblies } = await supabase
        .from('assemblies')
        .select(`
          *,
          bom:boms(bom_id, bom_name),
          assembled_item:inventory_items(item_id, item_name),
          assembly_units(
            *,
            assembly_items(
              *,
              item:inventory_items(item_id, item_name),
              source_purchase:purchases(purchase_id, purchase_date, vendors(vendor_name))
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!assemblies || assemblies.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No assemblies to export' });
        return;
      }

      const formattedData: any[] = [];
      assemblies.forEach(assembly => {
        if (assembly.assembly_units && Array.isArray(assembly.assembly_units)) {
          assembly.assembly_units.forEach((unit: any) => {
            if (unit.assembly_items && Array.isArray(unit.assembly_items)) {
              unit.assembly_items.forEach((item: any) => {
                formattedData.push({
                  assembly_id: assembly.id,
                  assembly_date: assembly.created_at,
                  assembly_status: assembly.assembly_status,
                  bom_id: assembly.bom?.bom_id || '',
                  bom_name: assembly.bom?.bom_name || '',
                  assembled_item_id: assembly.assembled_item_id,
                  assembled_item_name: assembly.assembled_item?.item_name || '',
                  unit_quantity: unit.quantity,
                  component_item_id: item.item_id,
                  component_item_name: item.item?.item_name || '',
                  component_quantity_used: item.quantity_used,
                  source_purchase_id: item.source_purchase?.purchase_id || '',
                  source_vendor: item.source_purchase?.vendors?.vendor_name || '',
                  source_purchase_date: item.source_purchase?.purchase_date || '',
                });
              });
            }
          });
        }
      });

      if (formattedData.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No assembly details to export' });
        return;
      }

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assemblies_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Assemblies exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportTraceability = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('assembly_items')
        .select(`
          *,
          assembly:assemblies(id, created_at, assembly_status, assembled_item_id),
          item:inventory_items(item_id, item_name),
          source_purchase:purchases(
            purchase_id,
            purchase_date,
            purchase_vendor_id,
            vendors(vendor_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No traceability data to export' });
        return;
      }

      const formattedData = data.map(item => ({
        assembly_item_id: item.id,
        assembly_date: item.assembly?.created_at || '',
        assembly_id: item.assembly_id,
        assembly_status: item.assembly?.assembly_status || '',
        assembled_into_item_id: item.assembly?.assembled_item_id || '',
        component_item_id: item.item_id,
        component_item_name: item.item?.item_name || '',
        quantity_used: item.quantity_used,
        source_purchase_id: item.source_purchase?.purchase_id || '',
        source_purchase_date: item.source_purchase?.purchase_date || '',
        source_vendor_id: item.source_purchase?.purchase_vendor_id || '',
        source_vendor_name: item.source_purchase?.vendors?.vendor_name || '',
        created_at: item.created_at,
      }));

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceability_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Traceability data exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportLeads = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No leads to export' });
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Leads exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportProspects = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No prospects to export' });
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospects_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Prospects exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No customers to export' });
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Customers exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportSales = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(customer_name),
          sale_items(
            *,
            inventory_item:inventory_items(item_name)
          )
        `)
        .order('sale_date', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No sales to export' });
        return;
      }

      const formattedData: any[] = [];
      data.forEach(sale => {
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            formattedData.push({
              sale_id: sale.sale_id,
              sale_date: sale.sale_date,
              customer_id: sale.customer_id,
              customer_name: sale.customer?.customer_name || '',
              item_id: item.item_id,
              item_name: item.inventory_item?.item_name || '',
              quantity_ordered: item.quantity_ordered,
              quantity_delivered: item.quantity_delivered,
              unit_price: item.unit_price,
              currency: sale.sale_currency,
              payment_terms: sale.payment_terms || '',
              notes: sale.sale_notes || '',
            });
          });
        }
      });

      if (formattedData.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No sale items to export' });
        return;
      }

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Sales exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const exportDeliveries = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('deliveries')
        .select(`
          *,
          sale:sales(sale_id, sale_date, customer:customers(customer_name)),
          delivery_items(
            *,
            item:inventory_items(item_name)
          )
        `)
        .order('delivery_date', { ascending: false });

      if (!data || data.length === 0) {
        setRestoreStatus({ show: true, type: 'warning', message: 'No deliveries to export' });
        return;
      }

      const formattedData: any[] = [];
      data.forEach(delivery => {
        if (delivery.delivery_items && Array.isArray(delivery.delivery_items)) {
          delivery.delivery_items.forEach((item: any) => {
            formattedData.push({
              delivery_id: delivery.delivery_id,
              delivery_date: delivery.delivery_date,
              sale_id: delivery.sale_id,
              sale_date: delivery.sale?.sale_date || '',
              customer_name: delivery.sale?.customer?.customer_name || '',
              item_id: item.item_id,
              item_name: item.item?.item_name || '',
              quantity_delivered: item.quantity_delivered,
              delivery_status: delivery.delivery_status,
              delivery_notes: delivery.delivery_notes || '',
            });
          });
        } else {
          formattedData.push({
            delivery_id: delivery.delivery_id,
            delivery_date: delivery.delivery_date,
            sale_id: delivery.sale_id,
            sale_date: delivery.sale?.sale_date || '',
            customer_name: delivery.sale?.customer?.customer_name || '',
            item_id: '',
            item_name: '',
            quantity_delivered: '',
            delivery_status: delivery.delivery_status,
            delivery_notes: delivery.delivery_notes || '',
          });
        }
      });

      const headers = Object.keys(formattedData[0]).join(',');
      const rows = formattedData.map(row => Object.values(row).map(v => JSON.stringify(v)).join(',')).join('\n');
      const csv = headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deliveries_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setRestoreStatus({ show: true, type: 'success', message: 'Deliveries exported successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to export: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const backupAll = async () => {
    setLoading(true);
    try {
      const [
        dropdownValues,
        vendors,
        items,
        boms,
        bomItems,
        purchases,
        purchaseItems,
        assemblies,
        assemblyUnits,
        assemblyItems,
        leads,
        prospects,
        customers,
        sales,
        saleItems,
        deliveries,
        deliveryItems,
        devices,
        tickets,
      ] = await Promise.all([
        supabase.from('dropdown_values').select('*'),
        supabase.from('vendors').select('*'),
        supabase.from('inventory_items').select('*'),
        supabase.from('boms').select('*'),
        supabase.from('bom_items').select('*'),
        supabase.from('purchases').select('*'),
        supabase.from('purchase_items').select('*'),
        supabase.from('assemblies').select('*'),
        supabase.from('assembly_units').select('*'),
        supabase.from('assembly_items').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('prospects').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('sale_items').select('*'),
        supabase.from('deliveries').select('*'),
        supabase.from('delivery_items').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('tickets').select('*'),
      ]);

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        version: '5.0',
        data: {
          dropdown_values: dropdownValues.data || [],
          vendors: vendors.data || [],
          inventory_items: items.data || [],
          boms: boms.data || [],
          bom_items: bomItems.data || [],
          purchases: purchases.data || [],
          purchase_items: purchaseItems.data || [],
          assemblies: assemblies.data || [],
          assembly_units: assemblyUnits.data || [],
          assembly_items: assemblyItems.data || [],
          leads: leads.data || [],
          prospects: prospects.data || [],
          customers: customers.data || [],
          sales: sales.data || [],
          sale_items: saleItems.data || [],
          deliveries: deliveries.data || [],
          delivery_items: deliveryItems.data || [],
          devices: devices.data || [],
          tickets: tickets.data || [],
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cajo_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'BACKUP_DATA',
        details: { timestamp: backup.timestamp, version: backup.version },
      });

      setRestoreStatus({ show: true, type: 'success', message: 'Backup created successfully' });
    } catch (error: any) {
      setRestoreStatus({ show: true, type: 'error', message: `Failed to create backup: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const validateBackup = (backup: any): backup is BackupData => {
    if (!backup || typeof backup !== 'object') return false;
    if (!backup.timestamp || !backup.data) return false;
    if (typeof backup.data !== 'object') return false;
    return true;
  };

  const restoreBackup = async (clearExisting: boolean) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setRestoreStatus({ show: true, type: 'error', message: 'Please select a backup file' });
      return;
    }

    setLoading(true);
    setRestoreStatus({ show: false, type: 'success', message: '' });

    try {
      const fileContent = await file.text();
      const backup: BackupData = JSON.parse(fileContent);

      if (!validateBackup(backup)) {
        setRestoreStatus({ show: true, type: 'error', message: 'Invalid backup file format' });
        return;
      }

      if (clearExisting) {
        const confirmMessage = 'WARNING: This will DELETE ALL existing data before restoring. This action CANNOT be undone. Type "DELETE ALL DATA" to confirm.';
        const userConfirmation = prompt(confirmMessage);

        if (userConfirmation !== 'DELETE ALL DATA') {
          setRestoreStatus({ show: true, type: 'warning', message: 'Restore cancelled - confirmation text did not match' });
          setLoading(false);
          return;
        }

        await deleteAllData();
      }

      const restoreOrder = [
        'dropdown_values',
        'vendors',
        'inventory_items',
        'boms',
        'bom_items',
        'purchases',
        'purchase_items',
        'leads',
        'prospects',
        'customers',
        'assemblies',
        'assembly_units',
        'assembly_items',
        'sales',
        'sale_items',
        'deliveries',
        'delivery_items',
        'devices',
        'tickets',
      ];

      let restored = 0;
      let failed = 0;

      for (const tableName of restoreOrder) {
        const tableData = backup.data[tableName as keyof typeof backup.data];
        if (tableData && Array.isArray(tableData) && tableData.length > 0) {
          try {
            const cleanedData = tableData.map(row => {
              const { created_by, updated_by, ...rest } = row;
              return {
                ...rest,
                created_by: userProfile?.id,
                updated_by: userProfile?.id,
              };
            });

            const { error } = await supabase.from(tableName).insert(cleanedData);

            if (error) {
              console.error(`Error restoring ${tableName}:`, error);
              failed++;
            } else {
              restored++;
            }
          } catch (error: any) {
            console.error(`Failed to restore ${tableName}:`, error);
            failed++;
          }
        }
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id,
        action: 'RESTORE_BACKUP',
        details: {
          timestamp: new Date().toISOString(),
          backup_timestamp: backup.timestamp,
          cleared_existing: clearExisting,
          tables_restored: restored,
          tables_failed: failed,
        },
      });

      if (failed === 0) {
        setRestoreStatus({
          show: true,
          type: 'success',
          message: `Backup restored successfully! ${restored} tables restored.`,
        });
      } else {
        setRestoreStatus({
          show: true,
          type: 'warning',
          message: `Backup partially restored. ${restored} tables succeeded, ${failed} failed. Check console for details.`,
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      setRestoreStatus({
        show: true,
        type: 'error',
        message: `Failed to restore backup: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAllData = async () => {
    const deleteOrder = [
      'tickets',
      'devices',
      'delivery_items',
      'deliveries',
      'sale_items',
      'sales',
      'assembly_items',
      'assembly_units',
      'assemblies',
      'bom_items',
      'boms',
      'purchase_items',
      'purchases',
      'customers',
      'prospects',
      'leads',
      'inventory_items',
      'vendors',
      'dropdown_values',
    ];

    for (const tableName of deleteOrder) {
      try {
        await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (error: any) {
        console.error(`Failed to clear ${tableName}:`, error);
      }
    }
  };

  return (
    <div className="space-y-8">
      {restoreStatus.show && (
        <div
          className={`p-4 rounded-lg border ${
            restoreStatus.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
              : restoreStatus.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
          }`}
        >
          <div className="flex items-start space-x-3">
            {restoreStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm flex-1">{restoreStatus.message}</p>
            <button
              onClick={() => setRestoreStatus({ ...restoreStatus, show: false })}
              className="text-sm font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">CSV Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => downloadTemplate('items')}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Items Template</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={() => downloadTemplate('vendors')}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Vendors Template</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Export Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => downloadData('items')}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Items</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={() => downloadData('vendors')}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Vendors</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportPurchases}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Purchases</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportBOM}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export BOM</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportAssemblies}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Assemblies</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportTraceability}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Traceability</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportLeads}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Leads</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportProspects}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Prospects</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportCustomers}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Customers</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportSales}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Sales</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>

          <button
            onClick={exportDeliveries}
            disabled={loading}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-green-600" />
              <span className="font-medium text-slate-900 dark:text-white">Export Deliveries</span>
            </div>
            <span className="text-sm text-slate-500">CSV</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Backup & Restore</h2>
        <div className="space-y-4">
          <button
            onClick={backupAll}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">
              {loading ? 'Creating Backup...' : 'Download Complete Backup'}
            </span>
          </button>

          {hasWriteAccess && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Restore from Backup</h3>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100
                  dark:file:bg-green-900/20 dark:file:text-green-400
                  dark:hover:file:bg-green-900/30
                  file:cursor-pointer cursor-pointer"
              />

              <button
                onClick={() => restoreBackup(true)}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {loading ? 'Restoring...' : 'Restore (Clear Existing)'}
                </span>
              </button>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-400 space-y-2">
                <p className="font-semibold">Important Backup Information:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Backups include all data: items, vendors, BOMs, assemblies, purchases, traceability, leads, prospects, customers, sales, deliveries, devices, and tickets</li>
                  <li><strong>Warning:</strong> Restore will delete ALL current data before restoring. This action cannot be undone!</li>
                  <li>Store backups securely in multiple locations for disaster recovery</li>
                  <li>Test restore procedures regularly to ensure backup integrity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
