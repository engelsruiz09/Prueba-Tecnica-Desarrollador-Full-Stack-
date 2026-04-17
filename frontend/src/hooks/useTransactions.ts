/**
 * Hook centralizado para operaciones de transacciones.
 * Usa TanStack Query para caché, loading states y refetch automático.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { transactionsApi } from "../api/transactions";

export function useTransactions(pageSize = 10) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Query: lista paginada — se refresca automáticamente al invalidar la clave
  const listQuery = useQuery({
    queryKey: ["transactions", page, pageSize],
    queryFn: () => transactionsApi.list(page, pageSize),
  });

  // Query: tipo de cambio actual
  const rateQuery = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: () => transactionsApi.getRate(1),
    staleTime: 1000 * 60 * 5, // 5 minutos — el tipo de cambio no cambia cada segundo
  });

  // Mutation: envío
  const sendMutation = useMutation({
    mutationFn: transactionsApi.send,
    onSuccess: () => {
      // Invalida la lista para que se refresque con el nuevo registro
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["exchange-rate"] });
    },
  });

  // Mutation: solicitud
  const requestMutation = useMutation({
    mutationFn: transactionsApi.request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["transactions"] });

  return {
    listQuery,
    rateQuery,
    sendMutation,
    requestMutation,
    page,
    setPage,
    invalidateList,
  };
}