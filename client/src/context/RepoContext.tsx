import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RepoInfo } from '../types';
import { fetchRepos, addRepo, deleteRepo, toggleStarRepo, setActiveRepo, openRepoViaDialog } from '../services/api';

interface RepoContextType {
  repositories: RepoInfo[];
  activeRepo: RepoInfo | null;
  isLoadingRepos: boolean;
  error: string | null;
  selectRepo: (id: string) => Promise<void>;
  refreshRepos: () => Promise<void>;
  addNewRepo: (path: string, name?: string, autoInit?: boolean) => Promise<RepoInfo>;
  openRepoDialog: () => Promise<RepoInfo | null>;
  removeRepo: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
}

const RepoContext = createContext<RepoContextType | null>(null);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<RepoInfo[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRepos = async () => {
    try {
      const data = await fetchRepos();
      setRepositories(data.repositories);
      setActiveRepoId(data.activeRepoId);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载仓库列表失败');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    refreshRepos();
  }, []);

  const selectRepo = async (id: string) => {
    try {
      const data = await setActiveRepo(id);
      setActiveRepoId(data.activeRepoId);
    } catch (err: any) {
      setError(err.message || '切换仓库失败');
    }
  };

  const addNewRepo = async (path: string, name?: string, autoInit?: boolean): Promise<RepoInfo> => {
    const data = await addRepo(path, name, autoInit);
    setRepositories(prev => {
      const filtered = prev.filter(r => r.id !== data.repo.id);
      return [...filtered, data.repo];
    });
    setActiveRepoId(data.activeRepoId);
    return data.repo;
  };

  const openRepoDialog = async (): Promise<RepoInfo | null> => {
    const data = await openRepoViaDialog();
    if (data.canceled || !data.repo) {
      return null;
    }
    setRepositories(prev => {
      const filtered = prev.filter(r => r.id !== data.repo!.id);
      return [...filtered, data.repo!];
    });
    if (data.activeRepoId) {
      setActiveRepoId(data.activeRepoId);
    }
    return data.repo;
  };

  const removeRepo = async (id: string) => {
    const res = await deleteRepo(id);
    setRepositories(prev => prev.filter(r => r.id !== id));
    setActiveRepoId(res.activeRepoId);
  };

  const toggleStar = async (id: string) => {
    const res = await toggleStarRepo(id);
    setRepositories(prev =>
      prev.map(r => (r.id === id ? { ...r, isStarred: res.repo.isStarred } : r))
    );
  };

  const activeRepo = repositories.find(r => r.id === activeRepoId) || null;

  return (
    <RepoContext.Provider
      value={{
        repositories,
        activeRepo,
        isLoadingRepos,
        error,
        selectRepo,
        refreshRepos,
        addNewRepo,
        openRepoDialog,
        removeRepo,
        toggleStar
      }}
    >
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error('useRepo must be used within a RepoProvider');
  return ctx;
};
