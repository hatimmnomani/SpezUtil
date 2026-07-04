import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/db-sotware-packages/',
    component: ComponentCreator('/db-sotware-packages/', '4a5'),
    routes: [
      {
        path: '/db-sotware-packages/',
        component: ComponentCreator('/db-sotware-packages/', '5b1'),
        routes: [
          {
            path: '/db-sotware-packages/',
            component: ComponentCreator('/db-sotware-packages/', '2c7'),
            routes: [
              {
                path: '/db-sotware-packages/',
                component: ComponentCreator('/db-sotware-packages/', 'db6'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
