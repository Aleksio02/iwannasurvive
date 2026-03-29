import { Route, Switch } from 'wouter'
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage/OpportunitiesPage'
import OpportunityDetailPage from './pages/Opportunities/OpportunityDetailPage/OpportunityDetailPage'
import Login from './pages/Auth/Login/Login'
import Register from './pages/Auth/Register/Register'
import SeekerDashboard from './pages/Dashboard/SeekerDashboard/SeekerDashboard'
import EmployerDashboard from './pages/Dashboard/EmployerDashboard/EmployerDashboard'
import CuratorDashboard from './pages/Dashboard/CuratorDashboard/CuratorDashboard'
import ProfileEdit from './pages/ProfileEdit/ProfileEdit'
import ProtectedRoute from './components/ProtectedRoute'
import PublicProfile from './pages/PublicProfile/PublicProfile'
import './styles/main.scss'

function App() {
    return (
        <Switch>
            {/* Публичные маршруты */}
            <Route path="/" component={OpportunitiesPage} />
            <Route path="/opportunities/:id" component={OpportunityDetailPage} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />

            {/* Защищённые маршруты */}
            <Route path="/seeker">
                <ProtectedRoute allowedRoles={['APPLICANT']}>
                    <SeekerDashboard />
                </ProtectedRoute>
            </Route>

            <Route path="/employer">
                <ProtectedRoute allowedRoles={['EMPLOYER']}>
                    <EmployerDashboard />
                </ProtectedRoute>
            </Route>

            <Route path="/curator">
                <ProtectedRoute allowedRoles={['CURATOR', 'ADMIN']}>
                    <CuratorDashboard />
                </ProtectedRoute>
            </Route>
            <Route path="/seekers/:id" component={PublicProfile} />

            <Route path="/profile/edit">
                <ProtectedRoute allowedRoles={['APPLICANT', 'EMPLOYER']}>
                    <ProfileEdit />
                </ProtectedRoute>
            </Route>

            {/* 404 - перенаправляем на главную */}
            <Route>{(params) => <Navigate to="/" />}</Route>
        </Switch>
    )
}

export default App