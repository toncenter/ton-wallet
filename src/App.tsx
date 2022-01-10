import { Navigate, Route, Routes } from 'react-router-dom';

import StartPage from './pages/Start/StartPage';
import CreatedPage from './pages/Created/CreatedPage';
import BackupPage from './pages/Backup/BackupPage';
import CreatePasswordPage from './pages/CreatePassword/CreatePasswordPage';
import ReadyToGoPage from './pages/ReadyToGo/ReadyToGoPage';
import MainPage from './pages/Main/MainPage';
import ImportPage from './pages/Import/ImportPage';

function App() {
    return (
        <Routes>
            <Route path="start" element={<StartPage />} />
            <Route path="created" element={<CreatedPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="password" element={<CreatePasswordPage />} />
            <Route path="ready" element={<ReadyToGoPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="" element={<MainPage />} />
            <Route
                path="*"
                element={<Navigate replace to="/start" />}
            />
        </Routes>
    )
}

export default App;
