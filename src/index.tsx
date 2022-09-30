import 'piral/polyfills';
import * as React from 'react'
import { createPiral, Piral, SetComponent, LoadingIndicatorProps, SetRoute, Dashboard , PiralInstance, PiletApi, PiralPlugin} from 'piral';
import { layout, Layout } from './layout';
import { ErrorInfo, errors } from './layout/Error'
import { render } from 'react-dom';
import { DashboardContainer, DashboardTile } from './layout/Dashboard';
import { MenuContainer} from './layout/Menu'
import { NotificationsHost, NotificationsToast } from './layout/Notifications';
import CONSTANTS from './constants.js'
import { createContainersApi } from 'piral-containers';

import {createStateApi} from './apis'

sessionStorage.setItem('dbg:view-state', "off")

function filterItems(res) {
  const items = res.items
  const toBeLoaded = ["auth-pilet"]
  const config = []
  for (const item of items) {
    if (toBeLoaded.includes(item.name)) {
      config.push(item)
    }
  }
  return config
}

const Loader: React.FC<LoadingIndicatorProps> = () => (
  <div className="app-center">
    <div className="spinner circles">Loading ...</div>
  </div>
);

function makePiral(feedUrl) {

  // ugly, make better when time ...
  function reshapeConfig(config) {
    const items = []
    const added = []
    const filtered = []
    for (const page of config.pages) {
      if (page.modules) {
        const mod = constructTree(page, [])
        items.push(mod)
      }
      items.push(page)
    }
    for (const item of items.flat()) {
      if (!added.includes(item.link)) {
        filtered.push(item)
        added.push(item.link)
      }
    }
    return filtered
  }

  function constructTree(root, recursiveArray?) {
    const resources = root.modules
    for (const res of resources) {
      recursiveArray.push(res);
      if (res.modules) {
        recursiveArray = constructTree(res, recursiveArray);
      } else {
        recursiveArray.push(res)
      }
    }
    return recursiveArray;
  }


  

  const p = createPiral({
    requestPilets() {
      return fetch(feedUrl)
        .then((res) => res.json())
        .then((res) => {
          const items = reshapeConfig(res)
          return items
        })
    },
    plugins: [createStateApi(), createContainersApi()]
  });

  p.root.setData("CONSTANTS", CONSTANTS)
  return p
}

const App = () => {
  const [feedUrl, setFeedUrl] = React.useState(CONSTANTS.FEEDURL)
  const [piral, setPiral] = React.useState(makePiral(feedUrl))

  React.useEffect(() => {
    if (piral === undefined && feedUrl) {
      const p = makePiral(feedUrl)
      setPiral(p)
    }
  }, [piral])

  return (
    <div>
      {piral ? (
        <div>
          <PiralComponent piral={piral} />
        </div>
      ) : (
        <div>

        </div>
      )}
      {/* <input type="text" defaultValue={feedUrl} onChange={e => setFeedUrl(e.target.value)} />
      <button onClick={() => setPiral(undefined)}>load</button> */}
    </div> 
  )
}


const PiralComponent = ({ piral }: {piral: PiralInstance}) => {
  return (
    <Piral instance={piral}>
      <SetComponent name="Layout" component={Layout} />
      <SetComponent name="DashboardContainer" component={DashboardContainer} />
      <SetComponent name="DashboardTile" component={DashboardTile} />
      <SetComponent name="MenuContainer" component={MenuContainer} />
      <SetComponent name="LoadingIndicator" component={Loader} />
      <SetComponent name="ErrorInfo" component={ErrorInfo} />
      <SetComponent name="NotificationsHost" component={NotificationsHost} />
      <SetComponent name="NotificationsToast" component={NotificationsToast} />
      <SetRoute path="/" component={Dashboard} />
    </Piral>
  )
}

render(<App />, document.querySelector('#app'));
