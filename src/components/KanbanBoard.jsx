import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export function KanbanBoard({ columns, items, onDragEnd, onCardClick, renderCardContent, renderColumnHeader }) {
  
  // Agrupa os itens por colunas
  const getItemsForColumn = (columnId) => {
    return items.filter(item => item.column_id === columnId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '600px' }}>
        {columns.map(column => (
          <div key={column.id} style={{ minWidth: '300px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-glass)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{column.title}</h3>
              {renderColumnHeader && renderColumnHeader(column)}
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    padding: '16px',
                    flexGrow: 1,
                    minHeight: '200px',
                    background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {getItemsForColumn(column.id).map((item, index) => (
                    <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onCardClick && onCardClick(item)}
                          style={{
                            userSelect: 'none',
                            padding: '16px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: snapshot.isDragging ? 'var(--accent-purple)' : 'var(--border-glass)',
                            boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.3)' : 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            cursor: 'grab',
                            ...provided.draggableProps.style
                          }}
                        >
                          {renderCardContent ? renderCardContent(item) : (
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{item.title}</h4>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
