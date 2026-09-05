import { useEnter } from '../components/Animations';
import AuthorityManagementComponent from '../components/dashboard/AuthorityManagement';

export default function AuthorityManagement() {
  const ref = useEnter([]);
  return (
    <div ref={ref}>
      <AuthorityManagementComponent />
    </div>
  );
}
