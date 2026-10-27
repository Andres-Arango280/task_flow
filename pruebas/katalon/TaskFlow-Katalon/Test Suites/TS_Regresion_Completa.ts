<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <description>Regresión E2E completa de TaskFlow: 16 casos (positivos y negativos). TC05 se itera con Data Files/credenciales_invalidas.</description>
   <name>TS_Regresion_Completa</name>
   <tag></tag>
   <isRerun>false</isRerun>
   <mailRecipient></mailRecipient>
   <numberOfRerun>0</numberOfRerun>
   <pageLoadTimeout>30</pageLoadTimeout>
   <pageLoadTimeoutDefault>true</pageLoadTimeoutDefault>
   <rerunFailedTestCasesOnly>false</rerunFailedTestCasesOnly>
   <rerunImmediately>false</rerunImmediately>
   <testSuiteGuid>31992e4f-cfb5-44da-86c9-aef3fb9a1523</testSuiteGuid>
   <testCaseLink>
      <guid>03be7362-7567-4770-add8-dd005806d372</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC01_Registro_Exitoso</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>4b8ac510-ff25-40a0-9a18-259d96c687cb</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC02_Registro_CorreoDuplicado</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>5a6fba2a-dce7-4224-8587-b77e7796adc9</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC03_Registro_ContrasenaCorta</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>01280512-5b31-4d8a-95c4-56e56aaa991e</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC04_Login_Exitoso</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>88c32cf8-ef7e-487f-a6d4-0b93fe93b113</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC05_Login_CredencialesInvalidas</testCaseId>
      <testDataLink>
         <combinationType>ONE</combinationType>
         <id>716a438a-b5a3-44e5-8937-13ac1159d9d8</id>
         <iterationEntity>
            <iterationType>ALL</iterationType>
            <value></value>
         </iterationEntity>
         <testDataId>Data Files/credenciales_invalidas</testDataId>
      </testDataLink>
      <usingDataBindingAtTestSuiteLevel>true</usingDataBindingAtTestSuiteLevel>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>escenario</value>
         <variableId>c432f10b-56f8-4dd5-ab89-609c4565e7de</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>correo</value>
         <variableId>13b829da-8312-4472-a48c-cf4b66a1d35b</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>contrasena</value>
         <variableId>ed801f3c-9691-4485-81b3-5dca36e6183d</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>preparacion</value>
         <variableId>888a3aeb-6ac7-4f24-af08-1fe7135ec45a</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>validacion</value>
         <variableId>821848b6-e7a8-4cf2-a1a8-8518f6304271</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>716a438a-b5a3-44e5-8937-13ac1159d9d8</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>mensaje</value>
         <variableId>09d2ebac-16b8-4c7c-a18a-202594a516e8</variableId>
      </variableLink>
   </testCaseLink>
   <testCaseLink>
      <guid>3cea4da8-d92c-4a6c-a07e-f4830a478134</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC06_RutaProtegida_SinSesion</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>708ea34d-8eae-4943-84b7-3b67db5dafdf</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC07_CrearEquipo</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>c0956cbf-7832-46de-8bac-375c46ffc267</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC08_InvitarMiembro_Exitoso</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>79067d3d-7883-4709-b785-f8e615264530</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC09_InvitarMiembro_CorreoInexistente</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>9a4c5a94-2462-46d8-aad1-81c82930cc41</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC10_CrearProyecto_TresColumnas</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>e1d29117-f7f5-4bac-9254-db57cc1e7b45</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC11_CrearTarea</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>ddb64102-5f87-4f09-964f-97011a113c8e</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC12_MoverTarea_ProgresoActualizado</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>e5bb6274-0f76-4bfc-bf24-61bf1f2c2c57</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC13_EliminarTarea_ConfirmarYDeshacer</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>7fec2d30-d0d2-4066-8f76-f141ed0e5306</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC14_BuscarTarea_ToleranteErrores</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>180dacc6-1217-423a-ba9b-ecd7992922ec</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC15_Preferencias_AltoContraste</testCaseId>
   </testCaseLink>
   <testCaseLink>
      <guid>57355582-3504-4e23-9db5-b16d0f7eb134</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/TC16_CerrarSesion</testCaseId>
   </testCaseLink>
</TestSuiteEntity>
