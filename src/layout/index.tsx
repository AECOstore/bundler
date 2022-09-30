import * as React from 'react';
import { ComponentsState, Menu, Notifications, SwitchErrorInfo } from 'piral';
import { Link } from 'react-router-dom';
import { DashboardContainer, DashboardTile } from './Dashboard';
import { MenuItem, MenuContainer} from './Menu';
import { NotificationsHost, NotificationsToast } from './Notifications';
import { ErrorInfo } from './Error';
import { LayoutProps } from 'piral-core';

export const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div>
    <Notifications />
    <Menu type="general" />
    <div className="container">{children}</div>
  </div>
)

export const layout: Partial<ComponentsState> = {
  ErrorInfo,
  DashboardContainer,
  DashboardTile,
  Layout,
  MenuContainer,
  MenuItem,
  NotificationsHost,
  NotificationsToast
};
