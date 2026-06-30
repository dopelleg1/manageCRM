import React from 'react';
import { Helmet } from 'react-helmet-async';
import SharedMap from '@/components/map/SharedMap';
import { useData } from '@/contexts/DataContext';
import { RingLoader } from 'react-spinners';
import { motion } from 'framer-motion';

const MapPage = () => {
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RingLoader color={"#36d7b7"} loading={loading} size={150} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mappa - CRM Immobiliare</title>
        <meta name="description" content="Visualizza tutte le proprietà e attività sulla mappa." />
      </Helmet>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        // Replaced custom 'h-screen-minus-header' class with explicit height calc
        // to ensure the map container has height even if the custom class is missing.
        // Assuming header is ~64px (h-16).
        className="h-[calc(100vh-64px)] w-full relative z-0"
      >
        <SharedMap />
      </motion.div>
    </>
  );
};

export default MapPage;