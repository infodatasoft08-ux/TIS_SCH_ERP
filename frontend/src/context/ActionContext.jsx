import React, { createContext, useContext, useState } from 'react';

const ActionContext = createContext();

export const ActionProvider = ({ children }) => {
  const [currentActions, setCurrentActions] = useState([]);

  return (
    <ActionContext.Provider value={{ currentActions, setCurrentActions }}>
      {children}
    </ActionContext.Provider>
  );
};

export const useActions = () => {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useActions must be used within an ActionProvider');
  }
  return context;
};
