import 'piral/polyfills';
import * as React from 'react'
import { createPiral, Piral, SetComponent, LoadingIndicatorProps, SetRoute, Dashboard, PiralInstance, PiletApi, PiralPlugin } from 'piral';
import { Fab, Box } from '@mui/material';
import {v4} from 'uuid'
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { layout, Layout } from './layout';
import { ErrorInfo, errors } from './layout/Error'
import { render } from 'react-dom';
import { DashboardContainer, DashboardTile } from './layout/Dashboard';
import { MenuContainer } from './layout/Menu'
import { NotificationsHost, NotificationsToast } from './layout/Notifications';
import CONSTANTS from './constants'
import { createContainersApi } from 'piral-containers';
import * as piralcore from "piral-core"
import jsonld from 'jsonld'
import { createAecoStoreApi } from './apis'
import { getConfigQuery } from './queries'
import { Button } from '@mui/material'
const ttl2jsonld = require('@frogcat/ttl2jsonld').parse;
const QueryEngine = require('@comunica/query-sparql-link-traversal').QueryEngine;
const myEngine = new QueryEngine();

// const projectData = [
//   {
//     "projectUrl": "https://pod.werbrouck.me/engineer/40050b82-9907-434c-91ab-7ce7c137d8b6",
//     "pod": "https://pod.werbrouck.me/engineer/",
//     "endpoint": "https://sparql.werbrouck.me/engineer/sparql",
//     "referenceRegistry": "https://pod.werbrouck.me/engineer/a55eecd4-e773-436a-8013-5e2b6932fc28"
//   },
//   {
//     "projectUrl": "https://pod.werbrouck.me/fm/fb3d5bcd-8bcb-4d46-be2b-6c3ef824d5d9",
//     "pod": "https://pod.werbrouck.me/fm/",
//     "endpoint": "https://sparql.werbrouck.me/fm/sparql",
//     "referenceRegistry": "https://pod.werbrouck.me/fm/afa64a49-eae2-4a39-9fe4-3be92b491453"
//   },
//   {
//     "projectUrl": "https://pod.werbrouck.me/architect/0c39ccf8-b17e-47d8-a1d7-49a71c1a342f",
//     "pod": "https://pod.werbrouck.me/architect/",
//     "endpoint": "https://sparql.werbrouck.me/architect/sparql",
//     "referenceRegistry": "https://pod.werbrouck.me/architect/0d80e558-8f5b-491f-856b-636e29d3c2b5"
//   }
// ]

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

async function getTtl(data) {
  let config
  if (typeof data === "object") {return data}

  if (data.startsWith("http")) {
    const query = getConfigQuery
    const quadStream = await myEngine.queryQuads(query, { sources: [data], lenient: true })
    config = await configFromStream(quadStream)
  } else {
    config =  data
  }
  return config
}

async function remapConfigToJSON(turtle): Promise<any> {
  if (typeof turtle === "object") {
    return turtle
  }
  const jsonConfig = ttl2jsonld(turtle)
  const context = {
    "@context": {
      "link": { "@id": "http://w3id.org/mifesto#code", "@type": "@id" },
      "spec": "http://usefulinc.com/ns/doap#revision",
      "name": "http://www.w3.org/2000/01/rdf-schema#label",
      "route": "http://w3id.org/mifesto#hasRoute",
      "type": { "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "@type": "@id" },
      "hosts": { "@id": "http://w3id.org/mifesto#hosts", "@type": "@id" },
      "compatibleMedia": { "@id": "http://w3id.org/mifesto#compatibleMedia", "@type": "@id" },
      "initialColumns": "http://w3id.org/mifesto#initialColumns",
      "initialRows": "http://w3id.org/mifesto#initialRows"
    }
  }
  const flattened = await jsonld.flatten(jsonConfig)
  const compacted = await jsonld.compact(flattened, context)
  const piralConfig = {
    items: compacted["@graph"] || [compacted],
    feed: "sample"
  }
  return piralConfig
}

function configFromStream(quadStream) {
  return new Promise((resolve, reject) => {
    let configuration = ""
    quadStream.on('data', (quad) => {
      configuration += `<${quad.subject.value}> `
      configuration += `<${quad.predicate.value}> `
      if (quad.object.value.startsWith("http")) {
        configuration += `<${quad.object.value}> . `
      } else {
        configuration += `"${quad.object.value}" . `
      }
    })
    quadStream.on('end', () => resolve(configuration))
    quadStream.on('error', (err) => {
      console.log('error', err)
      reject(err)
    })
  })
}

async function returnItems(configuration) {
  return configuration.items
}


async function makePiral(configuration) {
  console.log('configuration :>> ', configuration);
  const p = createPiral({
    requestPilets() {
      return returnItems(configuration)
    },
    plugins: [createAecoStoreApi(), createContainersApi()]
  });
  p.root.setData("CONSTANTS", CONSTANTS)
  p.root.setData("CONFIGURATION", configuration)
  return p
}

const App = () => {
  const [feedUrl, setFeedUrl] = React.useState(CONSTANTS.DEFAULT_FEEDURL)
  const [id, setId] = React.useState(v4())
  // const [feedUrl, setFeedUrl] = React.useState(undefined)
  const [piral, setPiral] = React.useState(undefined)
  const [conceptLoading, setConceptLoading] = React.useState(false)
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    if (piral === undefined && feedUrl) {
      getTtl(feedUrl)
        .then((ttl) => remapConfigToJSON(ttl))
        .then(i => makePiral(i))
        .then(res => setPiral(res))
        .then(i => setId(v4()))
    }


  }, [piral, feedUrl])

  return (
    <div id={id}>
      {piral ? (
        <div>
          {(feedUrl !== "https://raw.githubusercontent.com/AECOstore/RESOURCES/main/configurations/welcome.ttl") ? (
            <Fab style={{ position: "fixed", right: 10, bottom: 10 }} color="primary" aria-label="add" onClick={() => { setFeedUrl("https://raw.githubusercontent.com/AECOstore/RESOURCES/main/configurations/welcome.ttl"); setPiral(undefined) }}>
              <AddBusinessIcon sx={{ mr: 1 }} />
            </Fab>
          ) : (
            <></>
          )}
          <PiralComponent piral={piral} setConceptLoading={setConceptLoading} setFeedUrl={setFeedUrl} setPiral={setPiral} />
        </div>
      ) : (
        <div>
          {/* <Store setFeedUrl={setFeedUrl}/> */}
        </div>
      )}
    </div>
  )
}

const PiralComponent = ({ piral, setConceptLoading, setFeedUrl, setPiral }: { piral: PiralInstance, setConceptLoading, setFeedUrl, setPiral }) => {
  // piral.root.setDataGlobal(CONSTANTS.ACTIVE_PROJECT, projectData)

  // piral.on('store-data', async ({ name, value }) => {
  //   if (name == CONSTANTS.SELECTED_REFERENCES) {
  //     setConceptLoading(true)
  //     const p = piral.root.getData(CONSTANTS.ACTIVE_PROJECT)
  //     const concepts = await piral.root.findConceptsById(value, p)
  //     console.log('concepts :>> ', concepts);
  //     piral.root.setDataGlobal(CONSTANTS.SELECTED_CONCEPTS, concepts)
  //     setConceptLoading(false)
  //     }
  // });

  piral.on('store-data', ({ name, value }) => {
    if (name == CONSTANTS.FEEDURL) {
      setFeedUrl(value)
      setPiral(undefined)
    }
  })

  // piral.on('store-data', async ({ name, value }) => {
  //   if (name == CONSTANTS.SELECTED_CONCEPTS) {
  //       const configuration = piral.root.getData("CONFIGURATION")
  //     }
  // });

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
      {/* <SetRoute path="/" component={Dashboard} /> */}
    </Piral>
  )
}

render(<App />, document.querySelector('#app'));
