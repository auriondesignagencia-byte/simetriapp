import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppProvider } from './store/app';
import { SessaoProvider } from './store/sessao';
import { ThemeProvider } from './store/theme';
import { PortaDeEntrada } from './PortaDeEntrada';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* A sessão vem por fora: o AppProvider precisa saber de quem são os dados
          antes de decidir o que carregar. */}
      <SessaoProvider>
        <PortaDeEntrada>
          <AppProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AppProvider>
        </PortaDeEntrada>
      </SessaoProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
