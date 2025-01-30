// Create new file for Categories tab
interface CategoriesTabProps {
  categoryDistribution: { name: string; value: number }[];
}

export const CategoriesTab = ({ categoryDistribution }: CategoriesTabProps) => {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 border border-blue-500/20 backdrop-blur-sm">
      <div className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-cyan-200 mb-6">
          Coin Categories Overview
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                Category
              </th>
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                Coin Count
              </th>
              <th className="py-4 px-6 text-left text-sm font-medium text-gray-400 bg-gray-900/40">
                Distribution
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {categoryDistribution.map((category) => (
              <tr
                key={category.name}
                className="hover:bg-blue-500/10 transition-colors"
              >
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-200 font-medium">
                      {category.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-200 font-bold">
                      {category.value}
                    </span>
                    <span className="text-gray-400 text-sm">coins</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{
                          width: `${
                            (category.value /
                              Math.max(
                                ...categoryDistribution.map((c) => c.value)
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm whitespace-nowrap">
                      {(
                        (category.value /
                          categoryDistribution.reduce(
                            (acc, curr) => acc + curr.value,
                            0
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
