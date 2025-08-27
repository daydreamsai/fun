import { useEffect, useCallback, useRef } from "react";
import { AnyAgent, AnyContext, InferSchemaArguments, AnyRef, ActionCall, ActionResult } from "@daydreamsai/core";
import { useMessageStore, MESSAGE_TYPES, MESSAGE_STATUS, UnifiedMessage } from "@/store/messageStore";
import { logger } from "@/utils/logger";

/**
 * Configuration pour les types de logs à traiter
 */
const LOG_TYPE_CONFIG = {
  input: { priority: 1, shouldStream: false },
  output: { priority: 1, shouldStream: true },
  thought: { priority: 2, shouldStream: true },
  action_call: { priority: 1, shouldStream: false },
  action_result: { priority: 1, shouldStream: false },
  step: { priority: 3, shouldStream: false },
  error: { priority: 0, shouldStream: false }, // Priorité la plus haute
} as const;

/**
 * Interface pour les options du hook
 */
interface UseStreamingMessagesOptions {
  // Filtre des messages à afficher
  showThoughts?: boolean;
  showSystem?: boolean;
  showActions?: boolean;
  
  // Limite du nombre de messages à conserver en mémoire
  maxMessages?: number;
  
  // Callback pour les événements
  onMessageAdded?: (message: UnifiedMessage) => void;
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook principal pour le streaming de messages unifié
 * Remplace la logique dispersée dans hooks/agent.ts
 */
export function useStreamingMessages<TContext extends AnyContext>({
  agent,
  context,
  args,
  options = {}
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  options?: UseStreamingMessagesOptions;
}) {
  const contextId = agent.getContextId({ context, args });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const processedLogsRef = useRef<Set<string>>(new Set());
  
  const {
    addMessage,
    updateMessage,
    appendToMessage,
    startStreaming,
    stopStreaming,
    getMessages,
    addAgentLog,
    updateFromActionResult,
    clearMessages,
    isStreaming,
  } = useMessageStore();

  const {
    showThoughts = true,
    showSystem = true,
    showActions = true,
    maxMessages = 100,
    onMessageAdded,
    onStreamingStart,
    onStreamingEnd,
    onError,
  } = options;

  /**
   * Utilitaire pour notifier l'ajout d'un message
   */
  const notifyMessageAdded = useCallback((messageId: string) => {
    onMessageAdded?.(getMessages(contextId).find(m => m.id === messageId)!);
  }, [onMessageAdded, getMessages, contextId]);

  /**
   * Traite un log d'agent et le convertit en message unifié
   */
  const processAgentLog = useCallback((log: AnyRef, isDone: boolean) => {
    console.log("🔍 PROCESSING AGENT LOG:", {
      logRef: log.ref,
      logId: log.id,
      isDone,
      logContent: log.content,
      logData: log.data,
      alreadyProcessed: processedLogsRef.current.has(log.id)
    });

    // Éviter les doublons
    if (processedLogsRef.current.has(log.id)) {
      console.log("❌ SKIPPING - Already processed log:", log.id);
      return;
    }
    processedLogsRef.current.add(log.id);

    try {
      // Filtrer selon les préférences utilisateur
      const shouldProcess = shouldProcessLog(log, { showThoughts, showSystem, showActions });
      console.log("🎯 SHOULD PROCESS LOG:", {
        logRef: log.ref,
        shouldProcess,
        preferences: { showThoughts, showSystem, showActions }
      });
      
      if (!shouldProcess) {
        console.log("❌ FILTERED OUT - Log type not enabled:", log.ref);
        return;
      }

      logger.debug("Processing agent log", { 
        logRef: log.ref, 
        logId: log.id, 
        isDone 
      });

      // Gérer les différents types de logs
      console.log("🔄 PROCESSING LOG TYPE:", log.ref);
      switch (log.ref) {
        case 'input':
          console.log("📝 HANDLING INPUT LOG");
          handleInputLog(log);
          break;
          
        case 'output':
          console.log("🤖 HANDLING OUTPUT LOG");
          handleOutputLog(log, isDone);
          break;
          
        case 'thought':
          console.log("💭 HANDLING THOUGHT LOG");
          handleThoughtLog(log, isDone);
          break;
          
        case 'action_call':
          console.log("⚡ HANDLING ACTION CALL LOG");
          handleActionCallLog(log);
          break;
          
        case 'action_result':
          console.log("✅ HANDLING ACTION RESULT LOG");
          handleActionResultLog(log);
          break;
          
        case 'step':
          console.log("👣 HANDLING STEP LOG");
          handleStepLog(log, isDone);
          break;
          
        default:
          console.log("❓ HANDLING GENERIC LOG:", log.ref);
          handleGenericLog(log);
      }

      // Nettoyer les anciens messages si nécessaire
      cleanupOldMessages();

    } catch (error) {
      logger.error("Error processing agent log", { error, logId: log.id });
      onError?.(error as Error);
    }
  }, [contextId, showThoughts, showSystem, showActions, maxMessages, notifyMessageAdded, onError]);

  /**
   * Gère les logs d'entrée utilisateur
   */
  const handleInputLog = useCallback((log: AnyRef) => {
    const content = log.data?.content || log.content || 'User input';
    console.log("📝 ADDING USER MESSAGE:", content);
    const messageId = addMessage(contextId, {
      type: MESSAGE_TYPES.USER,
      content,
      status: MESSAGE_STATUS.COMPLETED,
      metadata: {
        logRef: log.ref,
        callId: log.id
      }
    });
    console.log("✅ USER MESSAGE ADDED:", messageId);
    
    notifyMessageAdded(messageId);
  }, [contextId, addMessage, notifyMessageAdded]);

  /**
   * Gère les logs de sortie agent avec streaming
   */
  const handleOutputLog = useCallback((log: AnyRef, isDone: boolean) => {
    const content = log.data?.content || log.content || 'Agent response';
    console.log("🤖 HANDLING AGENT OUTPUT:", {
      content,
      isDone,
      shouldStream: LOG_TYPE_CONFIG.output.shouldStream && !isDone,
      currentlyStreaming: isStreaming,
      logData: log.data
    });
    
    if (LOG_TYPE_CONFIG.output.shouldStream && !isDone) {
      // Démarrer ou continuer le streaming
      let streamingMessageId = useMessageStore.getState().streamingMessageId;
      console.log("🌊 STREAMING MODE - Current streaming ID:", streamingMessageId);
      
      if (!streamingMessageId) {
        streamingMessageId = addMessage(contextId, {
          type: MESSAGE_TYPES.AGENT,
          content: '',
          status: MESSAGE_STATUS.STREAMING,
          metadata: {
            logRef: log.ref,
            callId: log.id,
            streamBuffer: ''
          }
        });
        console.log("🆕 STARTED NEW STREAMING MESSAGE:", streamingMessageId);
        startStreaming(streamingMessageId);
        onStreamingStart?.();
      }
      
      appendToMessage(streamingMessageId, content);
      console.log("➕ APPENDED TO STREAMING MESSAGE:", content);
    } else {
      // Message complet
      if (isStreaming) {
        console.log("🛑 STOPPING STREAMING");
        stopStreaming();
        onStreamingEnd?.();
      }
      
      const completedMessageId = addMessage(contextId, {
        type: MESSAGE_TYPES.AGENT,
        content,
        status: MESSAGE_STATUS.COMPLETED,
        metadata: {
          logRef: log.ref,
          callId: log.id,
          isComplete: true
        }
      });
      console.log("✅ AGENT MESSAGE COMPLETED:", {
        messageId: completedMessageId,
        content: content.substring(0, 100)
      });
      
      notifyMessageAdded(completedMessageId);
    }
  }, [contextId, addMessage, appendToMessage, startStreaming, stopStreaming, isStreaming, onStreamingStart, onStreamingEnd, notifyMessageAdded]);

  /**
   * Gère les logs de pensée agent
   */
  const handleThoughtLog = useCallback((log: AnyRef, isDone: boolean) => {
    if (!showThoughts) {
      console.log("❌ THOUGHTS DISABLED - Skipping thought log");
      return;
    }
    
    const content = log.content || 'Agent thinking...';
    console.log("💭 ADDING THOUGHT MESSAGE:", {
      content: content.substring(0, 100),
      isDone,
      showThoughts
    });
    
    const messageId = addMessage(contextId, {
      type: MESSAGE_TYPES.THOUGHT,
      content,
      status: isDone ? MESSAGE_STATUS.COMPLETED : MESSAGE_STATUS.STREAMING,
      metadata: {
        logRef: log.ref,
        callId: log.id,
        isComplete: isDone
      }
    });
    console.log("✅ THOUGHT MESSAGE ADDED:", messageId);
    
    notifyMessageAdded(messageId);
  }, [contextId, showThoughts, addMessage, notifyMessageAdded]);

  /**
   * Gère les appels d'actions
   */
  const handleActionCallLog = useCallback((log: AnyRef) => {
    if (!showActions) return;
    
    const actionCall = log as ActionCall;
    const content = `Calling ${actionCall.name}`;
    
    const messageId = addMessage(contextId, {
      type: MESSAGE_TYPES.ACTION,
      content,
      status: MESSAGE_STATUS.PENDING,
      metadata: {
        logRef: log.ref,
        callId: log.id,
        actionType: actionCall.name,
        actionData: actionCall.data
      }
    });
    
    notifyMessageAdded(messageId);
  }, [contextId, showActions, addMessage, notifyMessageAdded]);

  /**
   * Gère les résultats d'actions
   */
  const handleActionResultLog = useCallback((log: AnyRef) => {
    const result = log as ActionResult;
    updateFromActionResult(result.callId, result);
  }, [updateFromActionResult]);

  /**
   * Gère les logs d'étapes
   */
  const handleStepLog = useCallback((log: AnyRef, isDone: boolean) => {
    if (!isDone) return; // N'afficher que les étapes terminées
    
    logger.debug("Step completed", { 
      step: log.data?.step || 'unknown',
      isDone 
    });
  }, []);

  /**
   * Gère les autres types de logs
   */
  const handleGenericLog = useCallback((log: AnyRef) => {
    if (!showSystem) return;
    
    const content = log.content || `System: ${log.ref}`;
    const messageId = addMessage(contextId, {
      type: MESSAGE_TYPES.SYSTEM,
      content,
      status: MESSAGE_STATUS.COMPLETED,
      metadata: {
        logRef: log.ref,
        callId: log.id
      }
    });
    
    notifyMessageAdded(messageId);
  }, [contextId, showSystem, addMessage, notifyMessageAdded]);

  /**
   * Nettoie les anciens messages pour éviter l'accumulation
   */
  const cleanupOldMessages = useCallback(() => {
    const messages = getMessages(contextId);
    if (messages.length > maxMessages) {
      const messagesToDelete = messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, messages.length - maxMessages);
      
      const { deleteMessage } = useMessageStore.getState();
      messagesToDelete.forEach(msg => {
        deleteMessage(msg.id);
      });
    }
  }, [contextId, maxMessages, getMessages]);

  /**
   * Souscrit aux logs de l'agent
   */
  useEffect(() => {
    // Nettoyer la souscription précédente
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Nouvelle souscription
    unsubscribeRef.current = agent.subscribeContext(contextId, (log, isDone) => {
      processAgentLog(log, isDone);
    });

    logger.info("Subscribed to agent context", { contextId });

    // Nettoyage
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Arrêter le streaming si actif
      if (isStreaming) {
        stopStreaming();
      }
      
      logger.info("Unsubscribed from agent context", { contextId });
    };
  }, [contextId, agent, processAgentLog, isStreaming, stopStreaming]);

  /**
   * Nettoie les logs traités quand le contexte change
   */
  useEffect(() => {
    processedLogsRef.current.clear();
  }, [contextId]);

  /**
   * Envoie un message utilisateur
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    try {
      // Ajouter le message utilisateur immédiatement
      addMessage(contextId, {
        type: MESSAGE_TYPES.USER,
        content: content.trim(),
        status: MESSAGE_STATUS.COMPLETED
      });

      // Envoyer à l'agent (sera géré par les logs)
      await agent.send({
        context,
        args,
        input: {
          type: "message",
          data: {
            user: "player", 
            content: content.trim()
          }
        }
      });

    } catch (error) {
      logger.error("Failed to send message", { error, contextId });
      
      // Ajouter un message d'erreur
      addMessage(contextId, {
        type: MESSAGE_TYPES.ERROR,
        content: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: MESSAGE_STATUS.ERROR
      });
      
      onError?.(error as Error);
    }
  }, [contextId, agent, context, args, addMessage, onError]);

  /**
   * Efface l'historique des messages
   */
  const clearHistory = useCallback(() => {
    clearMessages(contextId);
    processedLogsRef.current.clear();
    if (isStreaming) {
      stopStreaming();
    }
  }, [contextId, clearMessages, isStreaming, stopStreaming]);

  const messages = getMessages(contextId);
  console.log("📊 CURRENT MESSAGES STATE:", {
    contextId,
    messageCount: messages.length,
    messageTypes: messages.map(m => m.type),
    isStreaming
  });

  return {
    // État
    messages,
    isStreaming,
    
    // Actions
    sendMessage,
    clearHistory,
    
    // Contexte
    contextId,
  };
}

/**
 * Détermine si un log doit être traité selon les préférences
 */
function shouldProcessLog(
  log: AnyRef, 
  preferences: { showThoughts: boolean; showSystem: boolean; showActions: boolean }
): boolean {
  switch (log.ref) {
    case 'thought':
      return preferences.showThoughts;
    case 'action_call':
    case 'action_result':
      return preferences.showActions;
    case 'input':
    case 'output':
      return true; // Toujours afficher les messages principaux
    default:
      return preferences.showSystem;
  }
}

/**
 * Hook simplifié pour récupérer juste les messages d'un contexte
 */
export function useContextMessages(contextId: string) {
  return useMessageStore((state) => state.getMessages(contextId));
}

/**
 * Hook pour l'état de streaming
 */
export function useStreamingStatus() {
  return useMessageStore((state) => ({
    isStreaming: state.isStreaming,
    streamingMessage: state.getStreamingMessage()
  }));
}