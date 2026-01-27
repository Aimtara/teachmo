import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { getNavigationForRole } from '@/config/navigation';
import { createPageUrl } from '@/utils';
import { useStore } from '@/components/hooks/useStore';
import { Terminal, Compass, Play, ChevronsRight, Wand2 } from 'lucide-react';
import { getOrchestratorCatalog, executeOrchestratorCommand } from '@/api/orchestrator';
import { toast } from '@/components/ui/use-toast';

function flattenNav(items = []) {
  let all = [];
  for (const item of items) {
    if (item?.page) all.push(item);
    if (item?.children?.length) all = all.concat(flattenNav(item.children));
  }
  return all;
}

function riskRank(risk) {
  const normalized = String(risk || '').toLowerCase();
  if (normalized === 'low') return 0;
  if (normalized === 'medium') return 1;
  if (normalized === 'high') return 2;
  return 3;
}

function requiresInput(command) {
  const schema = command?.inputSchema || [];
  return schema.length > 0;
}

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { user } = useStore();
  const role = user?.user_type || 'parent';

  const [catalog, setCatalog] = React.useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(false);

  const navItems = React.useMemo(() => {
    const items = flattenNav(getNavigationForRole(role));
    const byPage = new Map();
    for (const item of items) {
      if (!item?.page) continue;
      if (!byPage.has(item.page)) byPage.set(item.page, item);
    }
    return Array.from(byPage.values());
  }, [role]);

  React.useEffect(() => {
    if (!open) return;

    let mounted = true;
    setIsLoadingCatalog(true);

    getOrchestratorCatalog()
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        setCatalog(items);
      })
      .catch(() => {
        if (!mounted) return;
        setCatalog([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingCatalog(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const quickRunnable = React.useMemo(() => {
    return [...catalog]
      .sort((a, b) => riskRank(a.risk) - riskRank(b.risk))
      .filter((command) => !requiresInput(command))
      .slice(0, 8);
  }, [catalog]);

  const needsCommandCenter = React.useMemo(() => {
    return [...catalog]
      .sort((a, b) => riskRank(a.risk) - riskRank(b.risk))
      .filter((command) => requiresInput(command))
      .slice(0, 8);
  }, [catalog]);

  const runCommand = async (key) => {
    try {
      const res = await executeOrchestratorCommand(key, {});
      toast({
        title: 'Command executed',
        description: `${key} \u2192 ${res?.run?.status || 'ok'}`,
      });
    } catch (error) {
      toast({
        title: 'Command failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      close();
    }
  };

  const openCommandCenter = (cmdKey) => {
    navigate(createPageUrl('CommandCenter', cmdKey ? { cmd: cmdKey } : {}));
    close();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, then commands\u2026" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={`nav-${item.page}`}
              value={`${item.name} ${item.page}`}
              onSelect={() => {
                navigate(createPageUrl(item.page));
                close();
              }}
            >
              <Compass className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
              <ChevronsRight className="ml-auto h-4 w-4 opacity-40" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Orchestrator">
          <CommandItem value="Open Command Center" onSelect={() => openCommandCenter()}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Open Command Center</span>
          </CommandItem>

          {isLoadingCatalog && (
            <CommandItem disabled value="Loading catalog">
              <Wand2 className="mr-2 h-4 w-4" />
              <span>Loading command catalog\u2026</span>
            </CommandItem>
          )}

          {!isLoadingCatalog && quickRunnable.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick run (no input)">
                {quickRunnable.map((command) => (
                  <CommandItem
                    key={`cmd-quick-${command.key}`}
                    value={`${command.title} ${command.key} ${command.risk} ${command.description || ''}`}
                    onSelect={() => runCommand(command.key)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{command.title}</span>
                      {command.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {command.description}
                        </span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {command.risk}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!isLoadingCatalog && needsCommandCenter.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Requires input (opens Command Center)">
                {needsCommandCenter.map((command) => (
                  <CommandItem
                    key={`cmd-input-${command.key}`}
                    value={`${command.title} ${command.key} ${command.risk} ${command.description || ''}`}
                    onSelect={() => openCommandCenter(command.key)}
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{command.title}</span>
                      {command.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {command.description}
                        </span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {command.risk}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!isLoadingCatalog && catalog.length === 0 && (
            <>
              <CommandSeparator />
              <CommandItem disabled value="No commands">
                <Play className="mr-2 h-4 w-4" />
                <span>No command catalog available.</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
