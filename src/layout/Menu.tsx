import * as React from 'react'
import { MenuContainerProps, MenuItemProps } from "piral-menu";
import { Link } from 'react-router-dom';

export const MenuContainer: React.FC<MenuContainerProps> = ({ children }) => {
    const [collapsed, setCollapsed] = React.useState(true);
    console.log('children menucontainer', children)
    return (
        <header>
            <nav className="navbar navbar-light navbar-expand-sm navbar-toggleable-sm ng-white border-bottom box-shadow mb-3" >
                <div className="container">
                    <Link className="navbar-brand" to="/">
                        ConSOLID
                    </Link>
                    <button
                        aria-label="Toggle navigation"
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="navbar-toggler mr-2">
                        <span className="navbar-toggler-icon" />
                    </button>
                    <div
                        className={`collapse navbar-collapse d-sm-inline-flex flex-sm-row-reverse ${collapsed ? '' : 'show'}`}
                        aria-expanded={!collapsed}>
                        <ul className="navbar-nav flex-grow">
                            {children}
                            {/* {defaultMenuItems} */}
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    );
}


export const MenuItem: React.FC<MenuItemProps> = ({ children }) => <li className="nav-item">{children}</li>;

const defaultMenuItems = (
    <>
      <MenuItem type="general" meta={{}}>
        <Link className="nav-link text-dark" to="/store">
          Store
        </Link>
      </MenuItem>
    </>
  );