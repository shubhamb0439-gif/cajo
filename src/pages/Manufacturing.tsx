import BOMBuilder from '../components/manufacturing/BOMBuilder';
import Assembly from '../components/manufacturing/Assembly';
import Traceability from '../components/manufacturing/Traceability';

interface ManufacturingProps {
  section: 'bom' | 'assembly' | 'traceability';
}

export default function Manufacturing({ section }: ManufacturingProps) {
  const titles = {
    bom: 'BOM Builder',
    assembly: 'Assembly',
    traceability: 'Traceability',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{titles[section]}</h1>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        {section === 'bom' && <BOMBuilder />}
        {section === 'assembly' && <Assembly />}
        {section === 'traceability' && <Traceability />}
      </div>
    </div>
  );
}
