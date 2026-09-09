import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RepoInfo } from '../types';
import { fetchRepos, addRepo, deleteRepo, toggleStarRepo, setActiveRepo } from '../services/api';

interface RepoContextType {
  repositories: RepoInfo[];
  activeRepo: RepoInfo | null;
  isLoadingRepos: boolean;
  error: string | null;
  selectRepo: (id: string) => Promise<void>;
  refreshRepos: () => Promise<void>;
  addNewRepo: (path: string, name?: string) => Promise<RepoInfo>;
  removeRepo: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
}

const RepoContext = createContext<RepoContextType | null>(null);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<RepoInfo[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRepos = useCallback(async () => {
    try {
      setIsLoadingRepos(true);
      setError(null);
      const data = await fetchRepos();
      setRepositories(data.repositories);
      setActiveRepoId(data.activeRepoId || (data.repositories[0]?.id ?? null));
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    refreshRepos();
  }, [refreshRepos]);

  const selectRepo = async (id: string) => {
    try {
      setActiveRepoId(id);
      await setActiveRepo(id);
    } catch (err) {
      console.error('Failed to set active repo:', err);
    }
  };

  const addNewRepo = async (path: string, name?: string): Promise<RepoInfo> => {
    const data = await addRepo(path, name);
    setRepositories(prev => {
      const filtered = prev.filter(r => r.id !== data.repo.id);
      return [...filtered, data.repo];
    });
    setActiveRepoId(data.activeRepoId);
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
