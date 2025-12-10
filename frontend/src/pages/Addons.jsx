import { useEffect } from 'react';
import { useAddonsStore } from '../stores';
import { Puzzle, Check, Loader2, Plug } from 'lucide-react';

export default function Addons() {
  const { addons, isLoading, error, fetchAddons, enableAddon, disableAddon } = useAddonsStore();

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const handleToggle = async (addon) => {
    if (addon.enabled) {
      await disableAddon(addon.id);
    } else {
      await enableAddon(addon.id);
    }
  };

  if (isLoading && addons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Add-ons</h1>
        <p className="text-gray-600">
          Enhance your Spryte experience with specialized tools. Enable the add-ons you need.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`border rounded-xl p-6 transition-all ${
              addon.enabled
                ? 'border-primary-200 bg-primary-50/30'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  addon.enabled ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Puzzle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    addon.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {addon.is_free ? 'Free' : 'Premium'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(addon)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  addon.enabled
                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {addon.enabled ? (
                  <>
                    <Check className="w-4 h-4" />
                    Enabled
                  </>
                ) : (
                  'Enable'
                )}
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              {addon.description}
            </p>

            {addon.features && (
              <ul className="space-y-2">
                {addon.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {addons.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No add-ons available at the moment.</p>
            </div>
        )}
      </div>
    </div>
  );
}
