import { ErrorComponentsState, ErrorInfoProps, SwitchErrorInfo } from 'piral-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

export const errors: Partial<ErrorComponentsState> = {
    not_found: () => (
      <div>
        <p className="error">Could not find the requested page. Are you sure it exists?</p>
        <p>
          Go back <Link to="/">to the dashboard</Link>.
        </p>
      </div>
    ),
  };

export const ErrorInfo: React.FC<ErrorInfoProps> = props => (
    <div>
      <h1>Error</h1>
      <SwitchErrorInfo {...props} />
    </div>
)