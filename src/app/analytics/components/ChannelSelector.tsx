"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";

interface ChannelSelectorProps {
  channels: string[];
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
}

export function ChannelSelector({
  channels,
  selectedChannels,
  onChannelsChange,
}: ChannelSelectorProps) {
  const [tempSelectedChannels, setTempSelectedChannels] = useState<string[]>(
    []
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTempSelectedChannels(selectedChannels);
    }
  }, [open, selectedChannels]);

  const handleSelectAll = () => {
    setTempSelectedChannels(
      [...channels].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      )
    );
  };

  const handleDeselectAll = () => {
    setTempSelectedChannels([]);
  };

  const handleApply = () => {
    onChannelsChange(tempSelectedChannels);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-gray-900/60 border-gray-700/50 text-gray-200 hover:bg-gray-800/60"
        >
          Channels
          {selectedChannels.length > 0 && (
            <span className="ml-2 text-blue-400">
              ({selectedChannels.length})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-4 bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
        <div className="flex justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Deselect All
          </Button>
        </div>
        <ScrollArea className="h-[200px] mb-4">
          <div className="space-y-2">
            {channels.map((channel) => (
              <label
                key={channel}
                className="flex items-center px-4 py-2 hover:bg-gray-800/60 cursor-pointer rounded group"
              >
                <Checkbox
                  checked={tempSelectedChannels.includes(channel)}
                  onCheckedChange={(checked) => {
                    setTempSelectedChannels((prev) =>
                      checked
                        ? [...prev, channel]
                        : prev.filter((ch) => ch !== channel)
                    );
                  }}
                  className="mr-2 border-gray-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <span className="text-sm text-gray-200 group-hover:text-gray-100">
                  {channel}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
          >
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
